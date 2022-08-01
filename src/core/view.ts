import { Actor, AssetContainer, Context, ScaledTransformLike, User } from '@microsoft/mixed-reality-extension-sdk';
import { BoxAlignment, DOMElement } from './dom';
import { ViewElement, ViewElementOptions } from './element';
import { Button } from '../components/button';
import { Checkbox, CheckboxOptions } from '../components/checkbox';
import { Selector, SelectorOptions } from '../components/selector';
import { Text, TextOptions } from '../components/text';
import { TextInput, TextInputOptions } from '../components/textinput';
import { Table, TableOptions } from '../components/table';
import { Slider, SliderOptions } from '../components/slider';
import { Pager, PagerOptions } from '../components/pager';
import { Grid, GridOptions } from '../components/grid';
import { Stock, StockOptions } from '../components/stock';
import { NumberInput, NumberInputOptions } from '../components/number';
import { fetchText } from '../helper';
import { AssetData } from './style';

const fs = require('fs-extra');

interface promise {
        resolve: (...args: any[]) => void;
        reject: (reason?: any) => void;
}

export interface ViewOptions {
        xml?: string,
        url?: string,
        exclusive?: boolean,
        owner?: User,
        stylus?: Actor,
        transformLike?: Partial<ScaledTransformLike>,
        alignment?: BoxAlignment,
        hidden?: boolean,
        assets: { [name: string]: AssetData },
        baseUrl: string,
        roles?: string[],
}

export class View {
        private _created: boolean;
        private createPromises: promise[] = [];

        public dom: DOMElement;
        public root: ViewElement;

        get baseUrl() {
                return this.options.baseUrl;
        }

        constructor(private context: Context, private assets: AssetContainer, private options: ViewOptions) {
                this.init();
        }

        public async init() {
                if (!this.options.url && !this.options.xml) { return; }
                if (this.options.url) {
                        this.dom = await this.loadData(this.options.url);
                } else {
                        this.dom = new DOMElement(this.options.xml);
                }

                this.root = new ViewElement(this.context, this.assets, {
                        view: this,
                        dom: this.dom,
                        exclusive: this.options.exclusive,
                        owner: this.options.owner,
                        hidden: this.options.hidden,
                        assets: this.options.assets
                });

                this.render();
                // notify created
                this._created = true;
                this.notifyCreated(true);
        }

        private async loadData(url: string) {
                url = url.startsWith("http") ? url : `${this.options.baseUrl}/${url}`;
                const xml = await fetchText(url);
                return new DOMElement(xml);
        }

        public render() {
                this.applyStyle();
                this.root.children = [this.renderHelper(this.dom, this.root)];
        }

        private applyStyle() {
                if (!this.dom.root.css) { return; }
                this.dom.root.css.forEach(c => {
                        const selector = c['selector'];
                        const style = c['style'];
                        this.dom.find(selector).forEach(dom => {
                                dom.style = dom.style ? Object.assign({}, style, dom.style) : style;
                        });
                });
        }

        private renderHelper(dom: DOMElement, parent: ViewElement) {
                const layout = dom.layout;
                const tag = dom.tag;
                // const mat = dom.children.length > 0 ? this.context.assets.materials.find(m => m.name === 'invis') : this.context.assets.materials.find(m => m.name === 'invis');
                let mat = dom.children.length > 0 ? this.assets.materials.find(m => m.name === 'invis') : this.assets.materials.find(m => m.name === 'invis');
                if (dom.class == 'debug') { mat = this.assets.materials.find(m => m.name == 'debug') }
                const enabled = dom.children.length > 0 ? false : true;
                const owner = this.options.owner;
                const stylus = this.options.stylus;
                const exclusive = this.options.exclusive;
                const roles = this.options.roles;

                let options: ViewElementOptions;
                let element: ViewElement;
                options = {
                        view: this,
                        dom,
                        parent,
                        enabled,
                        material: mat,
                        dimensions: layout.dimensions,
                        transform: layout.transformLike,
                        owner,
                        stylus,
                        exclusive,
                        roles,
                        assets: this.options.assets
                };

                switch (tag) {
                        case 'Text':
                                options = Object.assign(options, dom.options);
                                element = dom.element ?
                                        dom.element.refresh(this.context, this.assets, options) :
                                        new Text(this.context, this.assets, options as TextOptions);
                                break;
                        case 'Button':
                                element = dom.element ?
                                        dom.element.refresh(this.context, this.assets, options) :
                                        new Button(this.context, this.assets, options);
                                break;
                        case 'Checkbox':
                                options = Object.assign(options, dom.options);
                                element = dom.element ?
                                        dom.element.refresh(this.context, this.assets, options) :
                                        new Checkbox(this.context, this.assets, options as CheckboxOptions);
                                break;
                        case 'Selector':
                                options = Object.assign(options, {
                                        defaultMaterial: this.assets.materials.find(m => m.name === 'invis'),
                                        highlightMaterial: this.assets.materials.find(m => m.name === 'highlight'),
                                        nullSelection: dom.options.nullSelection !== undefined ? dom.options.nullSelection : true,
                                        multiSelection: dom.options.multiSelection !== undefined ? dom.options.multiSelection : false,
                                        highlightAsset: dom.options.highlightAsset,
                                        defaultAsset: dom.options.defaultAsset,
                                });
                                element = dom.element ?
                                        dom.element.refresh(this.context, this.assets, options) :
                                        new Selector(this.context, this.assets, options as SelectorOptions);
                                break;
                        case 'Grid':
                                options = Object.assign(options, {
                                        defaultMaterial: this.assets.materials.find(m => m.name === 'invis'),
                                        highlightMaterial: this.assets.materials.find(m => m.name === 'highlight'),
                                        nullSelection: dom.options.nullSelection !== undefined ? dom.options.nullSelection : true,
                                        multiSelection: dom.options.multiSelection !== undefined ? dom.options.multiSelection : false,
                                        highlightAsset: dom.options.highlightAsset,
                                        defaultAsset: dom.options.defaultAsset,
                                        template_url: dom.options.template_url
                                });
                                element = dom.element ?
                                        dom.element.refresh(this.context, this.assets, options) :
                                        new Grid(this.context, this.assets, options as GridOptions);
                                break;
                        case 'Input':
                                options = Object.assign(options, dom.options);
                                element = dom.element ?
                                        dom.element.refresh(this.context, this.assets, options) :
                                        new TextInput(this.context, this.assets, options as TextInputOptions);
                                break;
                        case 'Pager':
                                options = Object.assign(options, dom.options);
                                element = dom.element ?
                                        dom.element.refresh(this.context, this.assets, options) :
                                        new Pager(this.context, this.assets, options as PagerOptions);
                                break;
                        case 'Number':
                                options = Object.assign(options, dom.options);
                                element = dom.element ?
                                        dom.element.refresh(this.context, this.assets, options) :
                                        new NumberInput(this.context, this.assets, options as NumberInputOptions);
                                break;
                        case 'Table':
                                options = Object.assign(options, {
                                        template_url: dom.options.template_url,
                                        defaultMaterial: this.assets.materials.find(m => m.name === 'invis'),
                                        highlightMaterial: this.assets.materials.find(m => m.name === 'highlight'),
                                        nullSelection: dom.options.nullSelection !== undefined ? dom.options.nullSelection : true,
                                });
                                element = dom.element ?
                                        dom.element.refresh(this.context, this.assets, options) :
                                        new Table(this.context, this.assets, options as TableOptions);
                                break;
                        case 'Slider':
                                options = Object.assign(options, {
                                        disabled: dom.options.disabled,
                                        animate: dom.options.animate,
                                        mask: dom.options.mask,
                                        puck: dom.options.puck,
                                        width: dom.options.width,
                                        height: dom.options.width,
                                });
                                element = dom.element ?
                                        dom.element.refresh(this.context, this.assets, options) :
                                        new Slider(this.context, this.assets, options as SliderOptions);
                                break;
                        case 'Stock':
                                options = Object.assign(options, {
                                        xmin: dom.options.xmin,
                                        xmax: dom.options.xmax,
                                        ymin: dom.options.ymin,
                                        ymax: dom.options.ymax,
                                        radius: dom.options.radius,
                                });
                                element = dom.element ?
                                        dom.element.refresh(this.context, this.assets, options) :
                                        new Stock(this.context, this.assets, options as StockOptions);
                                break;
                        default:
                                options = Object.assign(options, {
                                        hidden: dom.options.hidden,
                                });
                                element = dom.element ?
                                        dom.element.refresh(this.context, this.assets, options) :
                                        new ViewElement(this.context, this.assets, options);
                                break;
                }

                element.children = dom.children.map(childDom => {
                        return this.renderHelper(childDom, element);
                });

                // post render
                if (!dom.element) element.rendered();

                dom.element = element;

                return dom.element;
        }

        public reattach() {
                this.reattachHelper(this.root);
        }

        private reattachHelper(elem: ViewElement) {
                elem.reattach();
                elem.children.forEach(e=>e.reattach());
        }

        private notifyCreated(success: boolean) {
                this.createPromises.forEach(p => {
                        if (success) {
                                p.resolve();
                        } else {
                                p.reject();
                        }
                });
        }

        public enable() {
                this.root.enable();
        }

        public disable() {
                this.root.disable();
        }

        public destroy() {
                this.root.anchor.destroy();
        }

        public created() {
                if (!this._created) {
                        return new Promise<void>((resolve, reject) => this.createPromises.push({ resolve, reject }));
                } else {
                        return Promise.resolve();
                }
        }
}
