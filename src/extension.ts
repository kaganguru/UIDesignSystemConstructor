import * as vscode from "vscode";
import { DesignSystemEditorProvider } from "./editorProvider";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(DesignSystemEditorProvider.register(context));
}

export function deactivate() {}
