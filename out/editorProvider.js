"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignSystemEditorProvider = void 0;
const vscode = __importStar(require("vscode"));
const parser_1 = require("./parser");
const webview_1 = require("./webview");
class DesignSystemEditorProvider {
    static register(context) {
        return vscode.window.registerCustomEditorProvider("designSystemComposer.editor", new DesignSystemEditorProvider(context), { webviewOptions: { retainContextWhenHidden: true } });
    }
    constructor(context) {
        this.context = context;
    }
    async resolveCustomTextEditor(document, webviewPanel, _token) {
        webviewPanel.webview.options = { enableScripts: true };
        webviewPanel.webview.html = (0, webview_1.getWebviewContent)(webviewPanel.webview, this.context.extensionUri);
        let suppressNextUpdate = false;
        const getTemplate = () => {
            const cfg = vscode.workspace.getConfiguration("designSystemComposer");
            const userTemplate = cfg.get("systemPrompt", "");
            return userTemplate || parser_1.DEFAULT_TEMPLATE;
        };
        const getMdUri = () => {
            const jsonPath = document.uri.fsPath;
            const mdPath = jsonPath.replace(/\.design-system\.json$/, ".md");
            return vscode.Uri.file(mdPath);
        };
        const sendToWebview = () => {
            const text = document.getText().trim();
            let data;
            if (text === "" || text === "{}") {
                data = { ...parser_1.DEFAULT_DATA, components: [] };
            }
            else {
                try {
                    data = (0, parser_1.parseJson)(text);
                }
                catch {
                    vscode.window.showErrorMessage("Design System Composer: invalid JSON in config file. Showing defaults.");
                    data = { ...parser_1.DEFAULT_DATA, components: [] };
                }
            }
            webviewPanel.webview.postMessage({ type: "update", data });
        };
        const messageSubscription = webviewPanel.webview.onDidReceiveMessage(async (message) => {
            if (message.type === "save") {
                const data = message.data;
                const jsonContent = (0, parser_1.toJson)(data);
                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
                edit.replace(document.uri, fullRange, jsonContent);
                suppressNextUpdate = true;
                await vscode.workspace.applyEdit(edit);
                await document.save();
                suppressNextUpdate = false;
                const template = getTemplate();
                const composed = (0, parser_1.compose)(template, data);
                const mdUri = getMdUri();
                await vscode.workspace.fs.writeFile(mdUri, Buffer.from(composed, "utf-8"));
            }
        });
        const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.toString() === document.uri.toString() &&
                !suppressNextUpdate) {
                sendToWebview();
            }
        });
        webviewPanel.onDidDispose(() => {
            messageSubscription.dispose();
            changeSubscription.dispose();
        });
        sendToWebview();
    }
}
exports.DesignSystemEditorProvider = DesignSystemEditorProvider;
//# sourceMappingURL=editorProvider.js.map