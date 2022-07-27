import { AssetContainer, Context, User } from "@microsoft/mixed-reality-extension-sdk";
import { Selector, SelectorOptions } from "./selector";
import { promise } from "../menu";
import { fetchText } from "../helper";

export type GridCellData = any;

// Grid
export interface GridOptions extends SelectorOptions {
        template_url: string,
}

export type GridHandler = ((params: { user: User, id: string, selected: string }) => void);

export class Grid extends Selector {
        private _created: boolean;
        private createPromise: promise;

        public data: GridCellData[] = [];
        private template: string;

        constructor(context: Context, assets: AssetContainer, options: GridOptions) {
                super(context, assets, options);
                this.init();
        }

        private async init() {
                let url: string = (this.options as GridOptions).template_url;
                url = url.startsWith("http") ? url : `${this.view.baseUrl}/${url}`;
                this.template = await fetchText(url);
                // notify created
                this._created = true;
                this.notifyCreated(true);
        }

        public rendered() {
                super.rendered();
        }

        private createCell(cell: GridCellData) {
                return eval('`' + this.template + '`');
        }

        public updateCells() {
                this.find('.grid_cell').forEach(cell => {
                        const id = parseInt(cell.id);
                        const d = this.data[id];
                        let xml;
                        if (d) {
                                xml = this.createCell({ ...d, id });
                        } else {
                                xml = `<Button id=${id} width=${cell.dom.options.width} height=${cell.dom.options.height} margins=${cell.dom.options.margins} options='{textHeight:0.02}'></div>`;
                        }
                        cell.clear();
                        const el = cell.append(xml);
                        el?.find('Button').forEach(b => {
                                b.addUIEventHandler('click', (params: { user: User, id: string }) => {
                                        this.handleUIEvent('button', { user: params.user, id: params.id, index: cell.id });
                                });
                        });
                });
        }

        public appendCell(d: any) {
                this.find('.grid_cell').forEach((cell, i) => {
                        const id = parseInt(cell.id);
                        if (i != this.data.length) return;
                        let xml;
                        if (d) {
                                xml = this.createCell({ ...d, id });
                        }
                        cell.clear();
                        const el = cell.append(xml);
                        el.find('Button').forEach(b => {
                                b.addUIEventHandler('click', (params: { user: User, id: string }) => {
                                        this.handleUIEvent('button', { user: params.user, id: params.id, index: cell.id });
                                });
                        });
                });
                this.data.push(d);
        }

        public created() {
                if (!this._created) {
                        return new Promise<void>((resolve, reject) => this.createPromise = { resolve, reject });
                } else {
                        return Promise.resolve();
                }
        }

        private notifyCreated(success: boolean) {
                if (this.createPromise === undefined) { return; }
                if (success) {
                        this.createPromise.resolve();
                } else {
                        this.createPromise.reject();
                }
        }
}