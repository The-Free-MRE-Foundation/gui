import { ScaledTransformLike, Vector3Like } from "@microsoft/mixed-reality-extension-sdk";
import yoga, { YogaNode } from 'yoga-layout-prebuilt';
import cheerio from 'cheerio';
import { ViewElement } from "./element";

export const PixelsToMeters = 0.01;
const defaultElementDepth = 1;

export enum BoxAlignment {
        /** Position above and to the left of the anchor. */
        TopLeft = "top-left",
        /** Position directly above the anchor. */
        TopCenter = "top-center",
        /** Position above and to the right of the anchor. */
        TopRight = "top-right",
        /** Position directly left of the anchor. */
        MiddleLeft = "middle-left",
        /** Position directly on top of the anchor. */
        MiddleCenter = "middle-center",
        /** Position directly right of the anchor. */
        MiddleRight = "middle-right",
        /** Position below and to the left of the anchor. */
        BottomLeft = "bottom-left",
        /** Position directly below the anchor. */
        BottomCenter = "bottom-center",
        /** Position below and to the right of the anchor. */
        BottomRight = "bottom-right"
}

export interface DOMElementLayout {
        transformLike: Partial<ScaledTransformLike>,
        dimensions: { width: number, height: number, depth: number }
}

export interface DOMOptions {
}

export class DOMElement {
        tag: string;
        id: string;
        class: string;
        value: string;
        text: string;
        options: any;
        img: any;
        css: { [selector: string]: any }[];
        style: any;
        layout: DOMElementLayout;
        node: yoga.YogaNode;
        index: number;
        element: ViewElement;
        _parent: DOMElement;
        children: DOMElement[];
        root: DOMElement;
        width: number | "auto";
        height: number | "auto";

        get parent() { return this._parent; }
        set parent(p: DOMElement) {
                if (p) { this.root = p.root; }
                this._parent = p;
        }

        constructor(xml?: string, calculateLayout: boolean = true) {
                this.root = this;
                if (xml) {
                        const css = this.parseCSS(xml);
                        if (css) this.root.css = css;
                        xml = xml.replace(/<style>[\s\S]*<\/style>/, '');
                }
                this.node = xml ? this.parseXML(xml) : yoga.Node.create();
                if (calculateLayout) this.calculateLayout();
        }

        private calculateLayout() {
                this.node.calculateLayout();
                this.translate(this.node);
        }

        private parseCSS(xml: string) {
                const $ = cheerio.load(xml, { xmlMode: true, decodeEntities: false });
                const text = $('style').html();
                if (!text) { return; }
                let obj: { [selector: string]: any }[] = [];
                const matches = text.match(/([^\{^\}]*)(\{[^\{^\}]*\})/g);
                matches.forEach(m => {
                        const g = m.match(/([^\{^\}]*)\{([^\{^\}]*)\}/);
                        const [first, second] = [g[1], g[2]];
                        const style = this.parseStyle(second);
                        const selector = first.replace(/\n/g, '').replace(/^\s*/g, '').replace(/\s$/g, '');
                        obj.push({ selector, style });
                });
                return obj;
        }

        private parseStyle(text: string) {
                return eval(`({${text.replace(/;/g, ',')}})`);
        }

        private parseXML(xml: string) {
                const $ = cheerio.load(xml, { xmlMode: true, decodeEntities: false });
                const root = $.root().children();

                const rootNode = this.parseXMLHelper($, root, this);

                return rootNode;
        }

        private parseXMLHelper($: cheerio.Root, root: cheerio.Cheerio, dom: DOMElement) {
                const node = yoga.Node.create();

                dom.tag = (root[0] as cheerio.TagElement).name;
                dom.id = root.attr('id');
                dom.class = root.attr('class');
                dom.value = root.attr('value');
                dom.text = root.text();
                dom.options = root.attr('options') ? eval(`(${root.attr('options')})`) : {};
                dom.style = root.attr('style') ? this.parseStyle(root.attr('style')) : {};
                dom.img = root.attr('img') ? eval(`(${root.attr('img')})`) : {};
                dom.children = [];
                dom.node = node;

                const width = root.attr('width') ? (root.attr('width') == 'auto' ? 'auto' : parseFloat(root.attr('width'))) : 'auto';
                const height = root.attr('height') ? (root.attr('height') == 'auto' ? 'auto' : parseFloat(root.attr('height'))) : 'auto';

                // inject new xml
                if (dom.tag == 'Grid') {
                        const xml = `<root flexDirection='FLEX_DIRECTION_COLUMN_REVERSE' justifyContent='JUSTIFY_CENTER' alignItems='ALIGN_CENTER'>` + [...Array(dom.options.row).keys()].map(r => (
                                `
                <row flexDirection='FLEX_DIRECTION_ROW' justifyContent='JUSTIFY_CENTER' alignItems='ALIGN_CENTER' >
                    ${[...Array(dom.options.col).keys()].map(c => (
                                        `<div class="grid_cell" id=${r * dom.options.col + c} width=${dom.options.width} height=${dom.options.height} margins=${dom.options.margins} flexDirection='FLEX_DIRECTION_ROW' justifyContent='JUSTIFY_CENTER' alignItems='ALIGN_CENTER'></div>`
                                )).join('\n')}
                </row>
                `
                        )).join('\n') + '</root>';
                        root = cheerio.load(xml, { xmlMode: true, decodeEntities: false }).root().children();
                }

                dom.width = width;
                dom.height = height;
                node.setWidth(width);
                node.setHeight(height);
                if (root.attr('justifyContent')) node.setJustifyContent(this.parseOptions(root.attr('justifyContent')));
                if (root.attr('alignItems')) node.setAlignItems(this.parseOptions(root.attr('alignItems')));
                if (root.attr('alignSelf')) node.setAlignSelf(this.parseOptions(root.attr('alignSelf')));
                if (root.attr('flexDirection')) node.setFlexDirection(this.parseOptions(root.attr('flexDirection')) as yoga.YogaFlexDirection);
                if (root.attr('paddings')) node.setPadding(yoga.EDGE_ALL, root.attr('paddings'));
                if (root.attr('margins')) node.setMargin(yoga.EDGE_ALL, parseFloat(root.attr('margins')));
                if (root.attr('marginTop')) node.setMargin(yoga.EDGE_TOP, parseFloat(root.attr('marginTop')));
                if (root.attr('marginBottom')) node.setMargin(yoga.EDGE_BOTTOM, parseFloat(root.attr('marginBottom')));
                if (root.attr('marginLeft')) node.setMargin(yoga.EDGE_LEFT, parseFloat(root.attr('marginLeft')));
                if (root.attr('marginRight')) node.setMargin(yoga.EDGE_RIGHT, parseFloat(root.attr('marginRight')));
                if (root.attr('positionType')) node.setPositionType(this.parseOptions(root.attr('positionType')) as yoga.YogaPositionType);
                if (root.attr('x')) node.setPosition(yoga.EDGE_LEFT, parseFloat(root.attr('x')));
                if (root.attr('y')) node.setPosition(yoga.EDGE_BOTTOM, parseFloat(root.attr('y')));

                // children
                root.children().each((i: number, e: cheerio.Element) => {
                        const child = $(e);
                        const childDom: DOMElement = new DOMElement();
                        const childNode = this.parseXMLHelper($, child, childDom);
                        childDom.index = i;
                        node.insertChild(childNode, i);
                        dom.children.push(childDom);
                });

                return node;
        }

        private parseOptions(option: string) {
                switch (option) {
                        case 'JUSTIFY_SPACE_BETWEEN':
                                return yoga.JUSTIFY_SPACE_BETWEEN;
                        case 'JUSTIFY_SPACE_EVENLY':
                                return yoga.JUSTIFY_SPACE_EVENLY;
                        case 'JUSTIFY_CENTER':
                                return yoga.JUSTIFY_CENTER;
                        case 'JUSTIFY_FLEX_START':
                                return yoga.JUSTIFY_FLEX_START;
                        case 'JUSTIFY_FLEX_END':
                                return yoga.JUSTIFY_FLEX_END;
                        case 'FLEX_DIRECTION_ROW':
                                return yoga.FLEX_DIRECTION_ROW;
                        case 'FLEX_DIRECTION_COLUMN':
                                return yoga.FLEX_DIRECTION_COLUMN;
                        case 'FLEX_DIRECTION_ROW_REVERSE':
                                return yoga.FLEX_DIRECTION_ROW_REVERSE;
                        case 'FLEX_DIRECTION_COLUMN_REVERSE':
                                return yoga.FLEX_DIRECTION_COLUMN_REVERSE;
                        case 'ALIGN_CENTER':
                                return yoga.ALIGN_CENTER;
                        case 'ALIGN_FLEX_START':
                                return yoga.ALIGN_FLEX_START;
                        case 'ALIGN_FLEX_END':
                                return yoga.ALIGN_FLEX_END;
                        case 'POSITION_TYPE_RELATIVE':
                                return yoga.POSITION_TYPE_RELATIVE;
                        case 'POSITION_TYPE_ABSOLUTE':
                                return yoga.POSITION_TYPE_ABSOLUTE;
                        case 'POSITION_TYPE_RELATIVE':
                                return yoga.POSITION_TYPE_RELATIVE;
                        case 'POSITION_TYPE_ABSOLUTE':
                                return yoga.POSITION_TYPE_ABSOLUTE;
                }
        }

        private translate(rootNode: YogaNode) {
                const width = rootNode.getWidth();
                const height = rootNode.getHeight();
                const alignment = this.options ? (this.options.alignment ? this.options.alignment : 'bottom-left') : 'bottom-left';
                const [alignment_v, alignment_h] = alignment.split('-');
                const x = (alignment_h == 'left' ? 0 : (alignment_h == 'center' ? -width / 2 : -width));
                const y = (alignment_v == 'bottom' ? 0 : (alignment_h == 'middle' ? -height / 2 : -height));
                this.translateHelper(rootNode, null, this, { x, y, z: 0 });
        }

        private translateHelper(rootNode: YogaNode, parent: DOMElement, dom: DOMElement, offset: Vector3Like) {
                dom.parent = parent;

                const layout = rootNode.getComputedLayout();
                const depth = dom.options ? (dom.options.depth ? dom.options.depth : defaultElementDepth) : defaultElementDepth;
                const e: DOMElementLayout = {
                        transformLike: {
                                position: {
                                        x: (layout.left + layout.width / 2 + offset.x) * PixelsToMeters,
                                        y: (layout.top + layout.height / 2 + offset.y) * PixelsToMeters,
                                        z: (offset.z - depth / 2) * PixelsToMeters,
                                }
                        },
                        dimensions: {
                                width: layout.width * PixelsToMeters,
                                height: layout.height * PixelsToMeters,
                                depth: depth * PixelsToMeters,
                        }
                };

                dom.layout = e;

                if (rootNode.getChildCount() > 0) {
                        [...Array(rootNode.getChildCount()).keys()].forEach(i => {
                                const childNode = rootNode.getChild(i);
                                this.translateHelper(childNode, dom as DOMElement, dom.children[i], { x: -layout.width / 2, y: -layout.height / 2, z: depth / 2 });
                        });
                }
        }

        public update(dom: DOMElement) {
                this.value = dom.value;
                this.text = dom.text;
                this.style = dom.style;

                this.width = dom.width;
                this.node.setWidth(this.width);
                this.height = dom.height;
                this.node.setHeight(this.height);

                this.children.forEach((c, i) => {
                        c.update(dom.children[i]);
                });
        }

        public insert(xml: string, index: number, calc: boolean = true) {
                if (index < 0 || index > this.node.getChildCount()) { return; }
                const dom = new DOMElement(xml, false);
                dom.index = index;
                this.node.insertChild(dom.node, index);
                this.children.push(dom);
                if (calc) this.root.calculateLayout();

                return dom;
        }

        public append(xml: string, calc: boolean = true) {
                const index = this.node.getChildCount();
                return this.insert(xml, index, calc);
        }

        public prepend(xml: string, calc: boolean = true) {
                const index = 0;
                return this.insert(xml, index, calc);
        }

        public sibling(xml: string, index: number, calc: boolean = true) {
                const dom = new DOMElement(xml, false);
                this.parent.children.forEach((child, i) => {
                        if (i >= index) {
                                child.index++;
                        }
                });
                this.parent.node.insertChild(dom.node, index);
                this.parent.children.splice(index, 0, dom);
                if (calc) this.root.calculateLayout();

                return dom;
        }

        public after(xml: string, calc: boolean = true) {
                if (!this.parent) { return; }
                const index = this.index + 1;
                return this.sibling(xml, index, calc);
        }

        public before(xml: string, calc: boolean = true) {
                if (!this.parent) { return; }
                const index = this.index;
                return this.sibling(xml, index, calc);
        }

        public remove(calc: boolean = true) {
                this.parent.children.forEach((child) => {
                        if (child.index > this.index) {
                                child.index--;
                        }
                });
                this.parent.node.removeChild(this.node);
                this.parent.children.splice(this.index, 1);
                if (calc) this.root.calculateLayout();
        }

        public calc() {
                this.root.calculateLayout();
        }

        public find(selector: string) {
                const elements: DOMElement[] = [];
                this.findHelper(selector, this, elements);
                return elements;
        }

        private findHelper(selector: string, root: DOMElement, elements: DOMElement[]) {
                const [first, ...r] = selector.split(' ');
                const rest = r.length > 0 ? r.join(' ') : '';

                if (first[0] == '#') {
                        const name = first.slice(1);
                        selector = root.id == name ? rest : selector;
                } else if (first[0] == '.') {
                        const cls = first.slice(1);
                        selector = root.class == cls ? rest : selector;
                } else {
                        selector = root.tag == first ? rest : selector;
                }

                if (!selector) {
                        elements.push(root);
                        return;
                }

                root.children?.forEach(child => {
                        this.findHelper(selector, child, elements);
                });
        }
}