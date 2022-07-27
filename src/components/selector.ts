import { AssetContainer, Context, Material, User } from "@microsoft/mixed-reality-extension-sdk";
import { ViewElement, ViewElementOptions } from "../core/element";

// Selector
export interface SelectorOptions extends ViewElementOptions {
        nullSelection?: boolean,
        multiSelection?: boolean,
        defaultAsset?: string,
        highlightAsset?: string,
        defaultMaterial: Material,
        highlightMaterial: Material,
}

export type SelectHandler = ((params: { user: User, id: string, selected: string }) => void);

export class Selector extends ViewElement {
        private selectorOptions: SelectorOptions;

        private nullSelection: boolean = true;
        private multiSelection: boolean = false;
        protected _selected: string[] = [];

        get selected() { return this._selected; }
        public select(id: string) {
                // deselect
                if (this._selected.includes(id)) {
                        if (this.nullSelection && id !== null) {
                                const el = this.find(`#${id} .container`)[0];
                                el.anchor.appearance.material = this.selectorOptions.defaultMaterial;
                                if (this.selectorOptions.defaultAsset) {
                                        el.dom.style.asset = this.selectorOptions.defaultAsset;
                                        el.refreshStyle();
                                } else if (el.dom.options.defaultAsset) {
                                        el.dom.style.asset = el.dom.options.defaultAsset;
                                        el.refreshStyle();
                                }
                                const i = this._selected.findIndex(s => s === id);
                                this._selected.splice(i, 1);
                        }
                } else {
                        if (!this.multiSelection) {
                                this._selected.forEach(id => {
                                        const i = this._selected.findIndex(s => s === id);
                                        this._selected.splice(i, 1);

                                        const el = this.find(`#${id} .container`)[0];
                                        el.anchor.appearance.material = this.selectorOptions.defaultMaterial
                                        if (this.selectorOptions.defaultAsset) {
                                                el.dom.style.asset = this.selectorOptions.defaultAsset;
                                                el.refreshStyle();
                                        } else if (el.dom.options.defaultAsset) {
                                                el.dom.style.asset = el.dom.options.defaultAsset;
                                                el.refreshStyle();
                                        }
                                });
                        };
                        if (!this.dom.options.silent) {
                                const el = this.find(`#${id} .container`)[0];
                                el.anchor.appearance.material = this.selectorOptions.highlightMaterial;
                                if (this.selectorOptions.highlightAsset) {
                                        el.dom.style.asset = this.selectorOptions.highlightAsset;
                                        el.refreshStyle();
                                } else if (el.dom.options.highlightAsset) {
                                        el.dom.style.asset = el.dom.options.highlightAsset;
                                        el.refreshStyle();
                                }
                        }
                        this._selected.push(id);
                }
        }

        constructor(context: Context, assets: AssetContainer, options: SelectorOptions) {
                super(context, assets, options);
                this.events = [
                        'click',
                        'button',
                        'selected',
                        'hover-enter',
                        'hover-exit',
                ];
                this.eventParams = {
                        'click': ['user', 'id'],
                        'button': ['user', 'id', 'selected', 'prev'],
                        'selected': ['user', 'id', 'selected', 'prev'],
                        'hover-enter': ['user', 'id'],
                        'hover-exit': ['user', 'id'],
                };
                this.selectorOptions = options;
                this.nullSelection = this.selectorOptions.nullSelection !== undefined ? this.selectorOptions.nullSelection : true;
                this.multiSelection = this.selectorOptions.multiSelection !== undefined ? this.selectorOptions.multiSelection : false;
                this.addUIEventHandler('click', (param: { user: User, id: string }) => {
                        if (isNaN(parseInt(param.id))) return;
                        const prev = [...this.selected];
                        this.select(param.id);
                        this.handleUIEvent('selected', { user: param.user, id: param.id, selected: this.selected, prev });
                });
        }

        public val() {
                return this.selected.join(',');
        }

        public rendered() {
                this.find('Button').forEach((child, index) => {
                        if (!child.id) {
                                child.id = `${index}`;
                        }
                });
        }
}