import { Actor, AssetContainer, Context, User } from "@microsoft/mixed-reality-extension-sdk";
import { PixelsToMeters } from "../core/dom";
import { ViewElement, ViewElementOptions } from "../core/element";

export interface PagerOptions extends ViewElementOptions {
        totalPages?: number,
        defaultAsset?: string,
        highlightAsset?: string,
        puck?: {
                direction: string,
                asset: string,
                width: number,
                height: number
        }
};

export type PageHandler = ((params: { user: User, id: string, action: string }) => void);

export class Pager extends ViewElement {
        private _prev: ViewElement;
        private _next: ViewElement;
        private _num: ViewElement;
        protected _totalPages: number;

        private _dots: ViewElement;
        private _selected: string;

        private _bar: ViewElement;
        private puck: Actor;

        get totalPages() { return this._totalPages }
        set totalPages(t: number) {
                t = Math.max(t, 1);
                this._totalPages = t;
                if (this.dots) {
                        this.updateDots();
                }
                this.val(this.val());
        }

        get prev() { return this._prev; }
        set prev(prev: ViewElement) {
                this._prev = prev;
                prev?.addUIEventHandler('click', (params: { user: User, id: string }) => {
                        this.val(`${parseFloat(this.val()) - 1}`);
                        this.handleUIEvent('set', Object.assign(params, { action: 'prev' }));
                });
        }

        get next() { return this._next; }
        set next(next: ViewElement) {
                this._next = next;
                next?.addUIEventHandler('click', (params: { user: User, id: string }) => {
                        this.val(`${parseFloat(this.val()) + 1}`);
                        this.handleUIEvent('set', Object.assign(params, { action: 'next' }));
                });
        }

        get num() { return this._num; }
        set num(num: ViewElement) {
                this._num = num;
                num?.addUIEventHandler('click', (params: { user: User, id: string }) => {
                        params.user.prompt('Goto Page', true).then((dialog) => {
                                if (dialog.submitted) {
                                        const value = parseFloat(dialog.text);
                                        if (!isNaN(value)) {
                                                this.val(`${value - 1}`);
                                                this.handleUIEvent('set', Object.assign(params, { action: 'set' }));
                                        }
                                }
                        });
                });
        }

        get dots() { return this._dots; }
        set dots(dots: ViewElement) {
                this._dots = dots;
        }

        get bar() { return this._bar; }
        set bar(bar: ViewElement) {
                this._bar = bar;
        }

        constructor(context: Context, assets: AssetContainer, options: PagerOptions) {
                super(context, assets, options);
                this.events = [
                        'set'
                ];
                this.eventParams = {
                        'set': ['user', 'action'],
                };
                this.totalPages = (this.options as PagerOptions).totalPages ? (this.options as PagerOptions).totalPages : Infinity;
                this.value = this.value !== undefined ? this.value : '0';

                if ((this.options as PagerOptions).puck) {
                        const resourceId = this.options.assets[(this.options as PagerOptions).puck.asset].resourceId;
                        const d = this.options.assets[(this.options as PagerOptions).puck.asset].dimensions;
                        const dim = { width: (this.options as PagerOptions).puck.width * PixelsToMeters, height: (this.options as PagerOptions).puck.height * PixelsToMeters };
                        this.puck = Actor.CreateFromLibrary(this.context, {
                                resourceId,
                                actor: Object.assign({
                                        parentId: this.anchor.id,
                                        transform: {
                                                local: {
                                                        scale: { x: dim.width / d.width, y: dim.height / d.height, z: 1 },
                                                }
                                        }
                                }, this.options.exclusive ? { exclusiveToUser: this.options.owner.id } : {})
                        });
                }
        }

        public text(t?: string) {
                if (t !== undefined) {
                        this.dom.text = t;
                        this.num?.text(t);
                } else {
                        return this.dom.text;
                }
        }

        public val(v?: string) {
                if (v !== undefined && v == this.value) { return; }
                if (v !== undefined) {
                        const value = Math.min(Math.max(parseInt(v), 0), this.totalPages - 1);
                        this.handleArrows(value);
                        this.value = `${value}`;
                        this.text(`${value + 1}`);
                        if (this.dots) this.select(`${value}`);
                        if (this.bar) this.scroll(`${value}`);
                } else {
                        return this.value;
                }
        }

        protected async handleArrows(value: number) {
                const prev = this.prev;
                if (prev) {
                        await prev.anchor.created();
                }
                if (value <= 0) { prev?.disable(); }
                else { prev?.enable(); }

                const next = this.next;
                if (next) {
                        await next.anchor.created();
                }
                if (value >= this.totalPages - 1) { next?.disable(); }
                else { next?.enable(); }
        }

        private updateDots() {
                if (this._totalPages == Infinity || this._totalPages === undefined) { return; }
                const dots = this.dots.find('.dot');
                const dotsNumber = dots ? dots.length : 0;
                let i = 0;
                for (i = 0; i < this._totalPages && i < dotsNumber; i++);
                for (; i < this._totalPages; i++) {
                        const button = this.dots.append(`<Button class="dot" id="${i}" width=${this.dom.options.width} height=${this.dom.options.height} style='asset: "${(this.options as PagerOptions).defaultAsset}";'></Button>`);
                        button?.addUIEventHandler('click', (params: { user: User, id: string }) => {
                                this.val(params.id);
                                this.handleUIEvent('set', Object.assign(params, { action: 'set' }));
                        });
                }
                for (; i < dotsNumber; i++) {
                        (this.dots.find(`#${i}`)[0])?.remove();
                }
        }

        private select(id: string) {
                if (this._selected && this._selected != id) {
                        const e = this.dots.find(`#${this._selected}`)[0];
                        if (e) {
                                e.dom.style.asset = (this.options as PagerOptions).defaultAsset;
                                e.refreshStyle();
                        }
                }
                this._selected = id;
                const el = this.dots.find(`#${id}`)[0];
                if (el) {
                        el.dom.style.asset = (this.options as PagerOptions).highlightAsset;
                        el.refreshStyle();
                }
        }

        private scroll(page: string) {
                const dir = (this.options as PagerOptions).puck.direction;
                const l = dir == 'vertical' ? this.bar.dom.height as number : this.bar.dom.width as number;
                const b = dir == 'vertical' ? (this.options as PagerOptions).puck.height : (this.options as PagerOptions).puck.width;
                if (l === undefined || b === undefined) { return; }
                const d = (l - b) / (this.totalPages - 1) * parseInt(page) + (b - l) / 2;
                if (dir == 'vertical') {
                        this.puck.transform.local.position.y = -d * PixelsToMeters;
                } else {
                        this.puck.transform.local.position.x = d * PixelsToMeters;
                }
        }

        public rendered() {
                this.prev = this.find('#prev')[0];
                this.next = this.find('#next')[0];
                this.num = this.find('#num')[0];
                this.dots = this.find('#dots')[0];
                this.bar = this.find('#bar')[0];

                this.val('0');
        }

        public enable() {
                super.enable();
                const value = parseInt(this.val());
                const prev = this.prev;
                const next = this.next;
                if (value <= 0) {
                        prev.disable();
                }
                if (value >= this.totalPages - 1) {
                        next.disable();
                }
        }
}