import { Actor, AlphaMode, AssetContainer, ButtonBehavior, Color3, Context, DegreesToRadians, Quaternion, TextFontFamily, TextJustify, User } from "@microsoft/mixed-reality-extension-sdk";
import { DEFAULT_TEXT_ANCHOR, DEFAULT_TEXT_COLOR, DEFAULT_TEXT_FONT, DEFAULT_TEXT_HEIGHT, DEFAULT_TEXT_JUSTIFY, ViewElement, ViewElementOptions } from "../core/element";
import { parseHexColor } from "../helper";

const MIN_CLICK_INTERVAL = 300;
// Button
export interface ButtonOptions extends ViewElementOptions {
        img?: {
                url: string,
                width: number,
                height: number
        }
}

export type ButtonState = "pressed" | "holding" | "released";
export type HoverState = "enter" | "exit";
export type ButtonTriggerHandler = ((params: { user: User, id: string }) => void);
export class Button extends ViewElement {
        private _text: Actor;
        private _img: Actor;

        private lastUpdate: number = 0;

        constructor(context: Context, assets: AssetContainer, options: ButtonOptions) {
                super(context, assets, options);

                this.events = [
                        'click',
                        'pressed',
                        'holding',
                        'released',
                        'hover-enter',
                        'hover-exit',
                        'hover-released',
                ];

                this.eventParams = {
                        'click': ['user', 'id'],
                        'pressed': ['user', 'id'],
                        'holding': ['user', 'id'],
                        'released': ['user', 'id'],
                        'hover-enter': ['user', 'id'],
                        'hover-exit': ['user', 'id'],
                        'hover-released': ['user', 'id'],
                }

                this.setButtonBehavior();

                if (options.stylus) {
                        this.anchor.collider.isTrigger = true;
                        this.anchor.enableRigidBody({
                                isKinematic: true,
                                useGravity: false,
                        });
                        // on trigger
                        this.anchor.collider.onTrigger('trigger-exit', (actor: Actor) => {
                                if (actor.id == this.stylus.id) {
                                        const deltaTime = Date.now() - this.lastUpdate;
                                        this.lastUpdate = Date.now();
                                        if (deltaTime < MIN_CLICK_INTERVAL) { return; }
                                        this.handleUIEvent('click', { user: this.owner, id: this.id });
                                }
                        });
                }

                // text
                let textHeight = this.dom ? (this.dom.options.textHeight ? parseFloat(this.dom.options.textHeight) : DEFAULT_TEXT_HEIGHT) : DEFAULT_TEXT_HEIGHT;
                const textAnchor = this.dom ? (this.dom.options.textAnchor ? this.dom.options.textAnchor : DEFAULT_TEXT_ANCHOR) : DEFAULT_TEXT_ANCHOR;
                const textJustify = this.dom ? (this.dom.options.textJustify ? this.dom.options.textJustify : DEFAULT_TEXT_JUSTIFY) : DEFAULT_TEXT_JUSTIFY;
                const tx = this.dom ? (this.dom.options.tx ? this.dom.options.tx : 0) : 0;
                const ty = this.dom ? (this.dom.options.ty ? this.dom.options.ty : 0) : 0;
                const textColor = this.dom ? (this.dom.style.textColor ? parseHexColor(this.dom.style.textColor) : DEFAULT_TEXT_COLOR) : DEFAULT_TEXT_COLOR;
                const textFont = this.dom ? (this.dom.style.textFont ? this.dom.style.textFont : DEFAULT_TEXT_FONT) : DEFAULT_TEXT_FONT;
                textHeight = this.dom ? (this.dom.style.textHeight ? this.dom.style.textHeight : textHeight) : textHeight;
                this._text = Actor.Create(this.context, {
                        actor: Object.assign({
                                parentId: this.anchor.id,
                                transform: {
                                        local: {
                                                position: {
                                                        x: tx,
                                                        y: ty,
                                                        z: -this.options.dimensions.depth * 0.9
                                                }
                                        }
                                },
                                text: {
                                        contents: this.text(),
                                        height: textHeight,
                                        anchor: textAnchor,
                                        color: textColor,
                                        justify: textJustify as TextJustify,
                                        font: textFont as TextFontFamily,
                                }
                        }, this.options.exclusive ? { exclusiveToUser: this.options.owner.id } : {})
                });

                // img
                const img = this.dom.img;
                if (img) {
                        this.img(img);
                }
        }

        private loadMesh(dim: { width: number, height: number, depth: number }) {
        }

        public text(t?: string) {
                if (t !== undefined) {
                        if (this.dom) this.dom.text = t;
                        this._text.text.contents = t;
                } else {
                        return this.dom !== undefined ? this.dom.text : this._text.text.contents;
                }
        }

        public img(img: { url: string, width: number, height: number }) {
                if (!img || !img.url) {
                        this._img?.destroy();
                        return;
                }
                if (!this._img) {
                        // mesh
                        const sig = `${img.width},${img.height}`;
                        let mesh = this.assets.meshes.find(m => m.name === sig);
                        if (!mesh) {
                                mesh = this.assets.createPlaneMesh(sig, img.width, img.height);
                        }

                        // material
                        let tn = `texture_${img.url}`;
                        let texture = this.assets.textures.find(t => t.name === tn);
                        if (!texture) {
                                texture = this.assets.createTexture(tn, { uri: img.url });
                        }
                        let mn = `material_${img.url}`;
                        let material = this.assets.materials.find(m => m.name === mn);
                        if (!material) {
                                material = this.assets.createMaterial(mn, {
                                        emissiveColor: Color3.White(), emissiveTextureId: texture.id,
                                        color: Color3.White(), mainTextureId: texture.id,
                                        alphaMode: AlphaMode.Mask, alphaCutoff: 0,
                                });
                        }

                        this._img = Actor.Create(this.context, {
                                actor: Object.assign({
                                        parentId: this.anchor.id,
                                        appearance: {
                                                meshId: mesh.id,
                                                materialId: material.id,
                                        },
                                        transform: {
                                                local: {
                                                        position: {
                                                                x: 0,
                                                                y: 0,
                                                                z: -this.options.dimensions.depth * 0.6
                                                        },
                                                        rotation: Quaternion.FromEulerAngles(-90 * DegreesToRadians, 0, 0)
                                                }
                                        },
                                }, this.options.exclusive ? { exclusiveToUser: this.options.owner.id } : {})
                        });
                } else {
                        // material
                        let tn = `texture_${img.url}`;
                        let texture = this.assets.textures.find(t => t.name === tn);
                        if (!texture) {
                                texture = this.assets.createTexture(tn, { uri: img.url });
                        }
                        let mn = `material_${img.url}`;
                        let material = this.assets.materials.find(m => m.name === mn);
                        if (!material) {
                                material = this.assets.createMaterial(mn, {
                                        emissiveColor: Color3.White(), emissiveTextureId: texture.id,
                                        color: Color3.White(), mainTextureId: texture.id,
                                        alphaMode: AlphaMode.Mask, alphaCutoff: 0,
                                });
                        }

                        this._img.appearance.material = material;
                }
        }

        public val(v?: string) {
                if (v !== undefined) {
                        this.dom.value = v;
                } else {
                        return this.dom.value;
                }
        }

        private setButtonBehavior() {
                // behavior
                const buttonBehavior = this.anchor.setBehavior(ButtonBehavior);
                // on click
                buttonBehavior.onClick((user, _) => {
                        this.handleUIEvent('click', { user, id: this.id });
                });
                // on button
                ['pressed', 'holding', 'released'].forEach(event => {
                        buttonBehavior.onButton(event as ButtonState, (user, _) => {
                                this.handleUIEvent(event, { user, id: this.id });
                        });
                });
                // on hover
                ['hover-enter', 'hover-exit'].forEach(event => {
                        const e = event.split('-')[1];
                        buttonBehavior.onHover(e as HoverState, (user, _) => {
                                this.handleUIEvent(event, { user, id: this.id });
                        });
                });
        }

        public reattach() {
                this.setButtonBehavior();
        }
}
