import { User } from "@microsoft/mixed-reality-extension-sdk";
import { Grid } from "./components/grid";
import { Pager } from "./components/pager";
import { Table } from "./components/table";
import { ViewElement } from "./core/element";

export interface PaginatedListOptions {
        list: ViewElement,
        pager?: Pager,
        pageSize: number,
}

abstract class PaginatedList {
        public items: any[] = [];

        protected _pageNum: number = 0;
        protected list: ViewElement;
        protected pager: Pager;
        protected pageSize: number;

        get totalPageNum() {
                return Math.max(1, Math.floor(this.items.length / this.pageSize + ((this.items.length % this.pageSize == 0) ? 0 : 1)));
        }
        get pageNum() { return this._pageNum; }
        set pageNum(p: number) {
                if (p < 0 || p > (this.totalPageNum - 1)) { return; }
                if (this.pageNum == p) { return; }
                this._pageNum = p;
                this.update();
        }

        get page() {
                return this.items.slice(this.pageSize * (this.pageNum), this.pageSize * (this.pageNum + 1));
        }

        get index() {
                return this.page.map((_, i) => (this.pageSize * this.pageNum + i));
        }

        public update() {
                if (!this.pager) { return; }
                this.pager.totalPages = this.totalPageNum;
                this.pager.val(`${this.pageNum}`);
        }

        public append(data: any) {
                this.items.push(data);
                if (!this.pager) { return; }
                this.pager.totalPages = this.totalPageNum;
                this.pager.val(`${this.pageNum}`);
        }

        constructor(options: PaginatedListOptions) {
                this.list = options.list;
                this.pageSize = options.pageSize;

                this.pager = options.pager;
                this.pager?.addUIEventHandler('set', (params: { user: User, id: string, action: string }) => {
                        this.pageNum = parseInt(this.pager.val());
                });
        }
}

export class PaginatedGrid extends PaginatedList {
        update() {
                super.update();
                const grid = this.list as Grid;
                grid.data = this.page;
                grid.updateCells();
        }

        append(data: any) {
                super.append(data);
                const grid = this.list as Grid;
                grid.appendCell(data);
        }
}

export class PaginatedTable extends PaginatedList {
        update() {
                super.update();
                const table = this.list as Table;

                const length = table.data.length;
                const d: number[] = [];
                [...Array(this.pageSize).keys()].forEach(i => {
                        if (i < length && i < this.page.length) {
                                table.updateRow(this.page[i], i, false);
                        } else if (i < length && i >= this.page.length) {
                                // delete
                                d.push(i);
                        } else if (i >= length && i < this.page.length) {
                                table.appendRow(this.page[i], true);
                        }
                });
                d.sort((a, b) => (b - a)).forEach(i => {
                        table.deleteRow(i, false);
                });
                table.render();
        }
}