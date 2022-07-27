import { AssetContainer, Context, Material, User } from "@microsoft/mixed-reality-extension-sdk";
import { ViewElement, ViewElementOptions } from "../core/element";
import { fetchText } from "../helper";
import { promise } from "../menu";

export interface TableOptions extends ViewElementOptions {
        template_url: string,
        defaultMaterial?: Material,
        highlightMaterial?: Material,
        nullSelection?: boolean,
}

export type TableRowData = any;

export type TableClickHandler = ((params: { user: User, id: string, index: string }) => void);
export type TableSelectHandler = ((params: { user: User, id: string, selected: string }) => void);

export class Table extends ViewElement {
        private _created: boolean;
        private createPromise: promise;

        public data: TableRowData[] = [];
        private template: string;

        private nullSelection: boolean = true;
        private _selected: string = null;

        get selected() { return this._selected; }
        set selected(id: string) {
                // deselect
                if (this._selected == id) {
                        if (this.nullSelection) {
                                if (this.find(`#${id}`)[0])
                                        this.find(`#${id}`)[0].anchor.appearance.material = (this.options as TableOptions).defaultMaterial;
                                this._selected = null;
                        }
                } else {
                        if (this._selected) {
                                if (this.find(`#${this._selected}`)[0])
                                        this.find(`#${this._selected}`)[0].anchor.appearance.material = (this.options as TableOptions).defaultMaterial;
                        }
                        if (this.find(`#${id}`)[0])
                                this.find(`#${id}`)[0].anchor.appearance.material = (this.options as TableOptions).highlightMaterial;
                        this._selected = id;
                }
        }

        constructor(context: Context, assets: AssetContainer, options: TableOptions) {
                super(context, assets, options);

                this.events = [
                        'selected',
                        'button',
                        'checkbox',
                        'slider',
                ];

                this.eventParams = {
                        'selected': ['user', 'id', 'selected'],
                        'button': ['user', 'id', 'index'],
                        'checkbox': ['user', 'id', 'index', 'checked'],
                        'slider': ['user', 'id', 'index', 'percent'],
                };

                this.anchor.appearance.material = this.assets.materials.find(m => m.name === 'invis');
                this.init();
        }

        private async init() {
                let url: string = (this.options as TableOptions).template_url;
                url = url.startsWith("http") ? url : `${this.view.baseUrl}/${url}`;
                this.template = await fetchText(url);
                // notify created
                this._created = true;
                this.notifyCreated(true);
        }

        private createRow(row: TableRowData) {
                return eval('`' + this.template + '`');
        }

        public text(t?: string) {
                if (t !== undefined) {
                        if (this.dom) this.dom.text = t;
                } else {
                        return this.dom !== undefined ? this.dom.text : '';
                }
        }

        public val(v?: string) {
                if (v !== undefined) {
                        this.dom.value = v;
                } else {
                        return this.dom.value;
                }
        }

        public insertRows(rows: { row: TableRowData, index: number }[]) {
                for (let i = 0; i < rows.length; i++) {
                        const r = rows[i];
                        this.insertRow(r.row, r.index, false);
                }
                this.render();
        }

        public insertRow(row: TableRowData, index: number, render: boolean = true) {
                if (index < 0 || index > this.data.length) { return; }

                const xml = this.createRow(row);
                this.data.splice(index, 0, row);
                this.find('.table_row').forEach(row => {
                        const id = parseInt(row.id);
                        if (id >= index) {
                                row.id = `${id + 1}`;
                        }
                });
                const e = this.insert(xml, index, render);

                if (!render) { return; }
                e.class = 'table_row';
                e.id = `${index}`;

                e.find('Button').forEach(b => {
                        b.addUIEventHandler('click', (params: { user: User, id: string }) => {
                                this.handleUIEvent('button', { user: params.user, id: params.id, index: `${index}` })
                                if (params.id == 'name') {
                                        this.selected = `${index}`;
                                        this.handleUIEvent('selected', { user: params.user, id: params.id, selected: this.selected });
                                }
                        });
                });

                e.find('Slider').forEach(s => {
                        s.addUIEventHandler('click', (params: { user: User, id: string, percent: number }) => {
                                this.handleUIEvent('slider', { user: params.user, id: params.id, index: `${index}`, percent: params.percent })
                        });
                });

                e.find('Checkbox').forEach(c => {
                        c.addUIEventHandler('checked', (params: { user: User, id: string, checked: boolean }) => {
                                this.handleUIEvent('checkbox', { user: params.user, id: params.id, index: `${index}`, checked: params.checked })
                        });
                });
        }

        public appendRows(rows: { row: TableRowData }[]) {
                const ri = rows.map((r, i) => ({
                        row: r.row,
                        index: this.data.length + i,
                }));
                this.insertRows(ri);
        }

        public appendRow(row: TableRowData, render: boolean = true) {
                this.insertRow(row, this.data.length, render);
        }

        public updateRow(row: TableRowData, index: number, render: boolean = true) {
                if (index < 0 || index > this.data.length) { return; }
                const xml = this.createRow(row);
                this.find(`#${index}`)[0].update(xml, render);
        }

        public clear() {
                this.deleteRows([...Array(this.data.length).keys()]);
        }

        public deleteRows(indexes: number[]) {
                const sorted = indexes.sort((a, b) => (b - a));
                for (let i = 0; i < sorted.length; i++) {
                        const index = sorted[i];
                        this.deleteRow(index, false);
                }
                this.render();
        }

        public deleteRow(index: number, render: boolean = true) {
                if (index < 0 || index > this.data.length) { return; }
                this.data.splice(index, 1);

                this.find(`#${index}`)[0].remove(render);
                this.find('.table_row').forEach(row => {
                        const id = parseInt(row.id);
                        if (id >= index) {
                                row.id = `${id - 1}`;
                        }
                });
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