import { Actor, AssetContainer, Context, TextJustify } from "@microsoft/mixed-reality-extension-sdk";
import { DEFAULT_TEXT_ANCHOR, DEFAULT_TEXT_COLOR, DEFAULT_TEXT_HEIGHT, DEFAULT_TEXT_JUSTIFY, ViewElement, ViewElementOptions } from "../core/element";
import { parseHexColor } from "../helper";

export interface TextOptions extends ViewElementOptions {
}
export type TextHandler = ((params: {}) => void);

export class Text extends ViewElement {
        private _text: Actor;

        constructor(context: Context, assets: AssetContainer, options: TextOptions) {
                super(context, assets, options);

                this.anchor.appearance.material = assets.materials.find(m => m.name === 'invis');

                let textHeight = this.dom ? (this.dom.options.textHeight ? parseFloat(this.dom.options.textHeight) : DEFAULT_TEXT_HEIGHT) : DEFAULT_TEXT_HEIGHT;
                const textAnchor = this.dom ? (this.dom.options.textAnchor ? this.dom.options.textAnchor : DEFAULT_TEXT_ANCHOR) : DEFAULT_TEXT_ANCHOR;
                const textJustify = this.dom ? (this.dom.options.textJustify ? this.dom.options.textJustify : DEFAULT_TEXT_JUSTIFY) : DEFAULT_TEXT_JUSTIFY;
                const tx = this.dom ? (this.dom.options.tx ? this.dom.options.tx : 0) : 0;
                const ty = this.dom ? (this.dom.options.ty ? this.dom.options.ty : 0) : 0;
                const textColor = this.dom ? (this.dom.style.textColor ? parseHexColor(this.dom.style.textColor) : DEFAULT_TEXT_COLOR) : DEFAULT_TEXT_COLOR;
                textHeight = this.dom ? (this.dom.style.textHeight ? this.dom.style.textHeight : textHeight) : textHeight;
                // text
                this._text = Actor.Create(this.context, {
                        actor: Object.assign({
                                parentId: this.anchor.id,
                                transform: {
                                        local: {
                                                position: {
                                                        x: 0,
                                                        y: 0,
                                                        z: -this.options.dimensions.depth * 0.6
                                                }
                                        }
                                },
                                text: {
                                        contents: this.text(),
                                        height: textHeight,
                                        anchor: textAnchor,
                                        color: textColor,
                                        justify: textJustify as TextJustify,
                                }
                        }, this.options.exclusive ? { exclusiveToUser: this.options.owner.id } : {})
                });
        }

        public text(t?: string) {
                if (t !== undefined) {
                        this.dom.text = t;
                        this._text.text.contents = t;
                } else {
                        return this.dom.text;
                }
        }

        public val(v?: string) {
                if (v !== undefined) {
                        this.dom.value = v;
                } else {
                        return this.dom.value;
                }
        }

        public textHeight(h: number) {
                this._text.text.height = h;
        }
}
