import { Actor, AlphaMode, AssetContainer, Color3, Color3Like, Context, DegreesToRadians, Quaternion, User } from "@microsoft/mixed-reality-extension-sdk";
import { ViewElement, ViewElementOptions } from "../core/element";

const DEFAULT_RADIUS = 0.012;
const DOT_OFFSET = -0.01;
export const WHITE = { r: 1, g: 1, b: 1 };
export const BLUE = { r: 0.117, g: 0.505, b: 0.690 };
export const ORANGE = { r: 0.886, g: 0.529, b: 0.262 };

// Stock
export interface StockOptions extends ViewElementOptions {
        xmax: number,
        xmin: number,
        ymax: number,
        ymin: number,
        radius?: number,
}

export class Stock extends ViewElement {
        private _values: { [x: number]: number } = {};
        get values() {
                return this._values;
        }
        private _assets: { [x: number]: string } = {};

        private colors: { [x: number]: Color3Like } = {};

        private _highlighted: number;
        get highlighted() {
                return this._highlighted;
        }

        private prevAsset: string;
        private prevColor: Color3Like;

        private dots: { [x: number]: Actor } = {};
        private lines: { [x: number]: Actor } = {};

        private _xmax: number;
        private _ymax: number;
        private _xmin: number;
        private _ymin: number;

        get xmax() {
                return this._xmax;
        }
        get ymax() {
                return this._ymax;
        }
        get xmin() {
                return this._xmin;
        }
        get ymin() {
                return this._ymin;
        }

        set xmax(m: number) {
                this._xmax = m;
                this.updateBoundaries();
        }
        set ymax(m: number) {
                this._ymax = m;
                this.updateBoundaries();
        }
        set xmin(m: number) {
                this._xmin = m;
                this.updateBoundaries();
        }
        set ymin(m: number) {
                this._ymin = m;
                this.updateBoundaries();
        }

        constructor(context: Context, assets: AssetContainer, options: StockOptions) {
                super(context, assets, options);

                this.events = [
                ];

                this.eventParams = {
                }

                this._xmax = options.xmax;
                this._ymax = options.ymax;
                this._xmin = options.xmin;
                this._ymin = options.ymin;
        }

        private inverseLerp(a: number, b: number, t: number) {
                return (t - a) / (b - a);
        }

        public plot(x: number, y?: number, c?: Color3Like) {
                if (y === undefined) {
                        if (this._values[x] !== undefined) {
                                this._values[x] = undefined;
                                this.colors[x] = undefined;
                                this.dots[x]?.destroy();
                        }
                        return;
                }

                const options = this.options as StockOptions;
                // position
                const ry = this.inverseLerp(this.ymin, this.ymax, y);
                const h = this.options.dimensions.height;
                const py = (-h / 2 + h * ry);

                const rx = this.inverseLerp(this.xmin, this.xmax, x);
                const w = this.options.dimensions.width;
                const px = (-w / 2 + w * rx);

                if (this._values[x] === undefined) {
                        const r = options.radius ? options.radius : DEFAULT_RADIUS;
                        let name = `mesh_sphere_${r}`;
                        let mesh = this.assets.meshes.find(m => m.name === name);
                        if (!mesh) {
                                mesh = this.assets.createSphereMesh(name, r);
                        }

                        let material;
                        if (c) {
                                name = `material_${c.r},${c.g},${c.b}`;
                                material = this.assets.materials.find(m => m.name === name);
                                if (!material) {
                                        material = this.assets.createMaterial(name, { color: Color3.Black(), emissiveColor: c });
                                }
                        } else {
                                material = this.assets.materials.find(m => m.name === 'white');
                        }

                        const dot = Actor.Create(this.context, {
                                actor: {
                                        parentId: this.anchor.id,
                                        appearance: {
                                                meshId: mesh.id,
                                                materialId: material.id,
                                        },
                                        transform: {
                                                local: {
                                                        position: {
                                                                x: px,
                                                                y: py,
                                                                z: DOT_OFFSET
                                                        },
                                                        scale: {
                                                                x: 1,
                                                                y: 1,
                                                                z: 0.0001
                                                        },
                                                }
                                        },
                                }
                        });

                        this.dots[x] = dot;
                } else {
                        const dot = this.dots[x];
                        dot.transform.local.position.copy({ x: px, y: py, z: DOT_OFFSET });
                        if (c) {
                                let name = `material_${c.r},${c.g},${c.b}`;
                                let material = this.assets.materials.find(m => m.name === name);
                                if (!material) {
                                        material = this.assets.createMaterial(name, { color: Color3.Black(), emissiveColor: c });
                                }
                                dot.appearance.material = material;
                        }
                }
                this._values[x] = y;
                this.colors[x] = c;

        }

        public line(x: number, a?: string) {
                if (a === undefined) {
                        if (this._assets[x] !== undefined) {
                                this._assets[x] = undefined;
                                this.lines[x]?.destroy();
                        }
                        return;
                }

                if (this._assets[x] != a) {
                        this.lines[x]?.destroy();
                        this._assets[x] = a;
                        const asset = this.options.assets[a];
                        // position
                        const options = this.options as StockOptions;
                        const rx = this.inverseLerp(options.xmin, options.xmax, x);
                        const w = this.options.dimensions.width;
                        const px = (-w / 2 + w * rx);
                        const position = { x: px, y: 0, z: DOT_OFFSET }
                        // scale
                        const h = this.options.dimensions.height;
                        const d = asset.dimensions;
                        const s = h / d.height;

                        this.lines[x] = Actor.CreateFromLibrary(this.context, {
                                resourceId: asset.resourceId,
                                actor: {
                                        parentId: this.anchor.id,
                                        transform: {
                                                local: {
                                                        position,
                                                        scale: {
                                                                x: s,
                                                                y: s,
                                                                z: s,
                                                        }
                                                }
                                        }
                                },
                        });
                }
        }

        public highlight(x: number) {
                if (this._highlighted != x) {
                        // restore
                        if (this._highlighted !== undefined) {
                                this.line(this._highlighted, this.prevAsset);
                                if (this.values[this._highlighted]) {
                                        this.plot(this._highlighted, this.values[this._highlighted], this.prevColor);
                                }
                        }

                        // record
                        this._highlighted = x;
                        this.prevAsset = this._assets[x];
                        this.prevColor = this.colors[x] ? this.colors[x] : WHITE;

                        // new
                        this.line(x, 'Line Orange');
                        this.plot(x, this.values[x], ORANGE);
                }

                return this.values[x];
        }

        private updateBoundaries() {
                Object.keys(this._values).forEach(s => {
                        const x = parseInt(s);
                        const y = this._values[x];

                        // position
                        const ry = this.inverseLerp(this.ymin, this.ymax, y);
                        const h = this.options.dimensions.height;
                        const py = (-h / 2 + h * ry);

                        const rx = this.inverseLerp(this.xmin, this.xmax, x);
                        const w = this.options.dimensions.width;
                        const px = (-w / 2 + w * rx);

                        const dot = this.dots[x];
                        if (dot) {
                                dot.transform.local.position.copy({ x: px, y: py, z: DOT_OFFSET });
                        }
                        const line = this.lines[x];
                        if (line) {
                                line.transform.local.position.copy({ x: px, y: 0, z: DOT_OFFSET });
                        }
                });
        }

        public prevOf(x: number) {
                const xl = Object.keys(this.values).map(a => parseInt(a)).sort((a, b) => b - a);
                return xl[Math.max(0, xl.findIndex(i => i <= x) + 1)];
        }

        public nextOf(x: number) {
                const xl = Object.keys(this.values).map(a => parseInt(a)).sort((a, b) => a - b);
                return xl[Math.min(xl.length - 1, xl.findIndex(i => i >= x) + 1)];
        }
}