"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode_1 = require("vscode");
const netpbm_parser_1 = require("netpbm-parser");
class NetpbmContentProvider {
    constructor() {
        this.onDidChangeEmitter = new vscode_1.EventEmitter();
        this.onDidChange = this.onDidChangeEmitter.event;
    }
    provideTextDocumentContent(uri) {
        const path = vscode_1.Uri.parse(uri.path);
        const docRequest = vscode_1.workspace.openTextDocument(path);
        return docRequest.then((document) => {
            return document.getText();
        });
    }
}
const normalizeUri = (uri) => {
    let resource = uri;
    if (!(resource instanceof vscode_1.Uri)) {
        if (vscode_1.window.activeTextEditor) {
            return vscode_1.window.activeTextEditor.document.uri;
        }
    }
    return resource;
};
const getWebpageHtml = () => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
    </head>
    <body>
        <h1>Netpbm Preview</h1>
        <canvas id="image"></canvas>
        <script>
            const canvasEl = document.querySelector('#image')
            console.log(canvasEl)
            const ctx = canvasEl.getContext('2d')
            window.addEventListener('message', event => {
                const message = event.data; // The JSON data our extension sent
                const { command, payload } = message;
                console.log(command, payload)
                if (command === 'setImage') {
                    const {payload: {dimension: {width, height}, rgba}} = message;
                    canvasEl.width = width
                    canvasEl.height = height
                    const imgArray = Uint8ClampedArray.from(rgba)
                    console.log(width, height, imgArray)
                    const data = new ImageData(imgArray, width, height)
                    ctx.putImageData(data, 0, 0)
                }
            });
        </script>
    </body>
    </html>
    `;
};
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    let scheme = "netpbm";
    let contentProvider = new NetpbmContentProvider;
    context.subscriptions.push(vscode_1.workspace.registerTextDocumentContentProvider(scheme, contentProvider));
    const contentRegistry = new WeakMap();
    let panel;
    const getOrCreateWebviewPanel = (context) => {
        if (panel) {
            return panel;
        }
        panel = vscode_1.window.createWebviewPanel('netpbm-preview', 'Netpbm Preview', vscode_1.ViewColumn.Two, {
            enableScripts: true
        });
        panel.onDidDispose(() => {
            panel = undefined;
        }, undefined, context.subscriptions);
        panel.webview.html = getWebpageHtml();
        return panel;
    };
    function updatePreview(uri) {
        if (panel === undefined) {
            return;
        }
        const resource = normalizeUri(uri);
        const docContentRequest = contentProvider.provideTextDocumentContent(resource);
        return docContentRequest.then((docContent) => {
            const { dimension, rgba } = netpbm_parser_1.parse(docContent, 1);
            // rgba = new Uint8ClampedArray(100);
            panel.webview.postMessage({ command: 'setImage', payload: { dimension, rgba } });
        });
    }
    // TODO: How to keep the webview panel "stateless"?? 
    // https://code.visualstudio.com/api/extension-guides/webview#passing-messages-from-an-extension-to-a-webview
    function openPreviewToSide(uri) {
        return () => {
            let resource = normalizeUri(uri);
            panel = getOrCreateWebviewPanel(context);
            const docContentRequest = contentProvider.provideTextDocumentContent(resource);
            return docContentRequest.then((docContent) => {
                // Need to offload parse to the frontend.
                const { dimension, rgba } = netpbm_parser_1.parse(docContent, 1);
                console.log(rgba);
                panel.webview.postMessage({ command: 'setImage', payload: { dimension, rgba: [...rgba] } });
            });
        };
    }
    context.subscriptions.push(vscode_1.commands.registerCommand("netpbm-support.openPreviewToSide", openPreviewToSide()));
    context.subscriptions.push(vscode_1.workspace.onDidSaveTextDocument(document => {
        updatePreview(document.uri);
    }));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map