"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const editorProvider_1 = require("./editorProvider");
function activate(context) {
    context.subscriptions.push(editorProvider_1.DesignSystemEditorProvider.register(context));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map