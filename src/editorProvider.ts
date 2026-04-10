import * as vscode from "vscode";
import {
  parseJson,
  toJson,
  compose,
  DEFAULT_TEMPLATE,
  DEFAULT_DATA,
  DesignSystemData,
} from "./parser";
import { getWebviewContent } from "./webview";

export class DesignSystemEditorProvider
  implements vscode.CustomTextEditorProvider
{
  static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      "designSystemComposer.editor",
      new DesignSystemEditorProvider(context),
      { webviewOptions: { retainContextWhenHidden: true } }
    );
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = getWebviewContent(webviewPanel.webview, this.context.extensionUri);

    let suppressNextUpdate = false;

    const getTemplate = (): string => {
      const cfg = vscode.workspace.getConfiguration("designSystemComposer");
      const userTemplate = cfg.get<string>("systemPrompt", "");
      return userTemplate || DEFAULT_TEMPLATE;
    };

    const getMdUri = (): vscode.Uri => {
      const jsonPath = document.uri.fsPath;
      const mdPath = jsonPath.replace(/\.design-system\.json$/, ".md");
      return vscode.Uri.file(mdPath);
    };

    const sendToWebview = () => {
      const text = document.getText().trim();
      let data: DesignSystemData;

      if (text === "" || text === "{}") {
        data = { ...DEFAULT_DATA, components: [] };
      } else {
        try {
          data = parseJson(text);
        } catch {
          vscode.window.showErrorMessage(
            "Design System Composer: invalid JSON in config file. Showing defaults."
          );
          data = { ...DEFAULT_DATA, components: [] };
        }
      }

      webviewPanel.webview.postMessage({ type: "update", data });
    };

    const messageSubscription = webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.type === "save") {
          const data = message.data as DesignSystemData;

          const jsonContent = toJson(data);
          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
          );
          edit.replace(document.uri, fullRange, jsonContent);

          suppressNextUpdate = true;
          await vscode.workspace.applyEdit(edit);
          await document.save();
          suppressNextUpdate = false;

          const template = getTemplate();
          const composed = compose(template, data);
          const mdUri = getMdUri();
          await vscode.workspace.fs.writeFile(
            mdUri,
            Buffer.from(composed, "utf-8")
          );
        }
      }
    );

    const changeSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (
          e.document.uri.toString() === document.uri.toString() &&
          !suppressNextUpdate
        ) {
          sendToWebview();
        }
      }
    );

    webviewPanel.onDidDispose(() => {
      messageSubscription.dispose();
      changeSubscription.dispose();
    });

    sendToWebview();
  }
}
