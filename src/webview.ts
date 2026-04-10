import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function getWebviewContent(
  _webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const htmlPath = path.join(extensionUri.fsPath, "media", "webview.html");
  return fs.readFileSync(htmlPath, "utf-8");
}
