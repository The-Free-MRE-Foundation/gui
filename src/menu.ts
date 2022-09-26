import { Actor, User, Color3, ScaledTransformLike, AnimationEaseCurves, AnimationDataLike, ActorPath, AnimationWrapMode, Context, AssetContainer } from '@microsoft/mixed-reality-extension-sdk';
import { BoxAlignment } from './core/dom';
import { AssetData } from './core/style';
import { View } from './core/view';
import { translate } from './helper';

export interface promise {
        resolve: (...args: any[]) => void;
        reject: (reason?: any) => void;
}

export interface MenuOptions {
        url: string,
        exclusive?: boolean,
        transform?: Partial<ScaledTransformLike>,
        scale?: number,
        alignment?: BoxAlignment,
        animate?: boolean,
        assets?: { [name: string]: AssetData },
        baseUrl?: string,
        roles?: string[],
}

export class Menu {
        // logic
        private _create: boolean;
        private createPromise: promise;

        // view
        protected anchor: Actor;
        public view: View;

        get enabled() { return this.view.root.anchor.appearance.enabled; }

        private animating: boolean = false;
        private _closed: boolean = false;
        get closed() {
                return this._closed;
        }

        set roles(rl: string[]) {
                this.view.roles = rl;
        }

        constructor(protected context: Context, protected assets: AssetContainer, protected options: MenuOptions, public owner: User, protected stylus: Actor = null) {
                this.init();
        }

        protected async init() {
                this._create = false;

                let url = this.options.url;
                this.view = new View(this.context, this.assets, {
                        url,
                        exclusive: this.options.exclusive !== undefined ? this.options.exclusive : false,
                        owner: this.owner,
                        stylus: this.stylus,
                        alignment: this.options.alignment,
                        // hidden: this.options.animate ? true : false,
                        hidden: true,
                        assets: this.options.assets,
                        baseUrl: this.options.baseUrl,
                        roles: this.options.roles,
                });

                await this.view.created();
                await this.rendered();

                const scale = this.options.scale ? this.options.scale : 1;
                const transform = this.options.transform ? this.options.transform : {};
                const local = translate(transform).toJSON();
                this.anchor = this.view.root.anchor;
                this.anchor.transform.local.position.copy(local.position);
                this.anchor.transform.local.rotation.copy(local.rotation);
                if (this.options.animate) {
                        this.anchor.transform.local.scale.copyFromFloats(0, 0, 0);
                        this.anchor.appearance.enabled = true;
                        const animDataLike: AnimationDataLike = {
                                tracks: [
                                        {
                                                target: ActorPath("anchor").transform.local.scale,
                                                easing: AnimationEaseCurves.Linear,
                                                keyframes: [
                                                        {
                                                                time: 0,
                                                                value: { x: 0, y: 0, z: 0 }
                                                        },
                                                        {
                                                                time: 0.4,
                                                                value: { x: scale, y: scale, z: scale }
                                                        }
                                                ]
                                        }
                                ]
                        };
                        let animData = this.assets.animationData.find(m => m.name === 'animation_menu');
                        animData = this.assets.createAnimationData('animation_menu', animDataLike);
                        animData.bind({ anchor: this.anchor }, {
                                isPlaying: true,
                                wrapMode: AnimationWrapMode.Once
                        });
                } else {
                        this.anchor.transform.local.scale.copyFromFloats(scale, scale, scale);
                        this.anchor.appearance.enabled = true;
                }

                // notify created
                this._create = true;
                this.notifyCreated(true);
        }

        public loadMaterial(name: string, uri: string) {
                let texture = this.assets.textures.find(t => t.name === 'texture_' + name);
                if (!texture) {
                        texture = this.assets.createTexture('texture_' + name, { uri });
                }

                let material = this.assets.materials.find(m => m.name === 'material_' + name);
                if (!material) {
                        material = this.assets.createMaterial('material_' + name, { color: Color3.White(), mainTextureId: texture.id });
                }
                return material;
        }

        // public
        public setParent(parent: Actor) {
                const anchor = this.view.root.anchor;
                anchor.parentId = parent.id;
        }

        public setOffset(offset: { x: number, y: number, z: number }) {
                const anchor = this.view.root.anchor;
                anchor.transform.local.position.copyFromFloats(offset.x, offset.y, offset.z);
        }

        public disable() {
                this.view.disable();
        }

        public enable() {
                this.view.enable();
        }

        private notifyCreated(success: boolean) {
                if (this.createPromise === undefined) { return; }
                if (success) {
                        this.createPromise.resolve();
                } else {
                        this.createPromise.reject();
                }
        }

        public created() {
                if (!this._create) {
                        return new Promise<void>((resolve, reject) => this.createPromise = { resolve, reject });
                } else {
                        return Promise.resolve();
                }
        }

        public remove() {
                this.view.destroy();
        }

        public async rendered() { }

        public async close(animate: boolean = true) {
                if (this.animating) { return; }
                if (this.closed) { return; }
                this._closed = true;
                if (animate) {
                        this.animating = true;
                        const scale = this.options.scale ? this.options.scale : 1;
                        this.anchor.appearance.enabled = true;
                        const animDataLike: AnimationDataLike = {
                                tracks: [
                                        {
                                                target: ActorPath("anchor").transform.local.scale,
                                                easing: AnimationEaseCurves.Linear,
                                                keyframes: [
                                                        {
                                                                time: 0,
                                                                value: { x: scale, y: scale, z: scale }
                                                        },
                                                        {
                                                                time: 0.1,
                                                                value: { x: scale, y: 0, z: scale }
                                                        },
                                                        {
                                                                time: 0.2,
                                                                value: { x: 0, y: 0, z: 0 }
                                                        },
                                                ]
                                        }
                                ]
                        };
                        let animData = this.assets.animationData.find(m => m.name === 'animation_menu_close');
                        if (!animData) {
                                animData = this.assets.createAnimationData('animation_menu_close', animDataLike);
                        }
                        animData.bind({ anchor: this.anchor }, {
                                isPlaying: true,
                                wrapMode: AnimationWrapMode.Once
                        });
                        await new Promise(resolve => setTimeout(resolve, 0.4 * 1000));
                        this.anchor.transform.local.scale.copyFromFloats(0, 0, 0);
                        this.anchor.appearance.enabled = false;
                        this.animating = false;
                } else {
                        this.anchor.appearance.enabled = false;
                }
        }

        public async open(animate: boolean = true) {
                if (this.animating) { return; }
                if (!this.closed) { return; }
                this._closed = false;
                if (animate) {
                        this.animating = true;
                        const scale = this.options.scale ? this.options.scale : 1;
                        this.anchor.appearance.enabled = true;
                        const animDataLike: AnimationDataLike = {
                                tracks: [
                                        {
                                                target: ActorPath("anchor").transform.local.scale,
                                                easing: AnimationEaseCurves.Linear,
                                                keyframes: [
                                                        {
                                                                time: 0,
                                                                value: { x: 0, y: 0, z: 0 }
                                                        },
                                                        {
                                                                time: 0.1,
                                                                value: { x: scale, y: 0, z: scale }
                                                        },
                                                        {
                                                                time: 0.2,
                                                                value: { x: scale, y: scale, z: scale }
                                                        },
                                                ]
                                        }
                                ]
                        };
                        let animData = this.assets.animationData.find(m => m.name === 'animation_menu_open');
                        if (!animData) {
                                animData = this.assets.createAnimationData('animation_menu_open', animDataLike);
                        }
                        animData.bind({ anchor: this.anchor }, {
                                isPlaying: true,
                                wrapMode: AnimationWrapMode.Once
                        });
                        await new Promise(resolve => setTimeout(resolve, 0.2 * 1000));
                        this.anchor.transform.local.scale.copyFromFloats(scale, scale, scale);
                        this.animating = false;
                } else {
                        this.anchor.appearance.enabled = true;
                }
        }
}