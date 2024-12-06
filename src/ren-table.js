/*
:Date: 2024-12-06

:Version: 0.0.0

:Authors:

    * Mohammad Alghafli <thebsom@gmail.com>

RenTable, a table web component which renders data based on their type.

example:

<script src="src/ren-table-min.js" type="text/javascript"></script>
<table is="ren-table">
    <thead>
        <th is="ren-th" type="text" name="title">Column 1</th>
        <th is="ren-th" type="progress" name="completed">Column 2</th>
        <th is="ren-th" type="check" name="done">Column 3</th>
        <th is="ren-th" type="img" name="icon">Column 4</th>
    </thead>
    <tbody>
        <tr>
            <td is="ren-td" value="text 1">
                Content will be rendered based on value attribute.
                Any content in here will be replaced.
            </td>
            <td is="ren-td" value="30">
                Cell type is taken from the corresponding ren-th type attribute.
                A progress column will display percentage.
                The max is 100. This will be 30%.
                You can change the max with the max attribute for the ten-td or
                for the corresponding ren-th.
            </td>
            <td is="ren-td" value="1">
                A check type displays an X mark if the value is empty text or
                not defined.
                It displays a check mark if the value is not an empty text.
            </td>
            <td is="ren-td" value="/my-image.jpeg">
                An img type expects an image url. ren-table will create an <img>
                element in the cell.
            </td>
        </tr>
    </tbody>
</table>

<script>
    let t = document.querySelector("table[is=ren-table]");
    
    //remove all rows and create new rows from data
    //expects an array of rows
    t.from(
        [
            //row can be an array
            ["new text", 50, false, "/new-image.png"],
            //or object. data will be taken based on the name attribute of each
            //ren-th.
            {
                title: "more text",
                completed: 100,
                done: true,
                icon: "/another-image.jpeg"
            }
        ]
    );
    
    //or you can set rows from src attribute.
    t.setAttribute("src", "data.json");     //or t.src = "data.json";
    
    //you can convert array of arrays.
    //values will be exported to suitable type. progress will be converted to
    //Number (value / max). check will be converted to boolean.
    let data = t.to_array();
</script>
*/
'use strict';

class RenTableElement extends HTMLTableElement {
    static observedAttributes = ['src'];
    
    static renderers = {
        'text': function(td) {
            td.textContent = td.value;
        },
        'check': function(td) {
            let v = td.value ?? '';
            td.textContent = v ? '🗸' : '🞩';
        },
        'progress': function(td) {
            let v = Number(td.value);
            let max = Number(
                td.getAttribute('max') ??
                td.header?.getAttribute('max') ??
                100
            );
            
            td.textContent = `${Math.round(100 * td.value / max)}%`;
        },
        'img': function(td) {
            let img = document.createElement('img');
            img.src = td.value;
            td.innerHTML = '';
            td.append(img);
        },
    };
    
    static exporters = {
        'check': function(td) {
            return !! td.value;
        },
        'progress': function(td) {
            let max = Number(
                td.getAttribute('max') ??
                td.header?.getAttribute('max') ??
                100
            );
            
            return Number(td.value) / Number(max);
        },
    };
    
    static importers = {
        'check': function(v) {
            return v ? "1" : "";
        },
        'progress': function(v) {
            return String(v ?? "0");
        },
    };
    
    static add_renderer(name, f) {
        RenTableElement.renderers[name] = f;
    }
    
    static remove_renderer(name, f) {
        delete RenTableElement.renderers[name];
    }
    
    static add_exporter(name, f) {
        RenTableElement.exporters[name] = f;
    }
    
    static remove_exporter(name, f) {
        delete RenTableElement.exporters[name];
    }
    
    static add_importer(name, f) {
        RenTableElement.importers[name] = f;
    }
    
    static remove_importer(name, f) {
        delete RenTableElement.importers[name];
    }
    
    constructor() {
        super();
        
        this.update_regions = [];
        this.update_handle = null;
    }
    
    connectedCallback() {
        this.children_observer = new MutationObserver(
            this.on_children_changed.bind(this)
        );
        this.children_observer.observe(this, {childList: true});
        
        this.thead_observer = new MutationObserver(
            this.on_thead_children_changed.bind(this)
        );
        this.observed_thead = null;
        
        this.thead_tr_observer = new MutationObserver(
            this.on_thead_tr_children_changed.bind(this)
        );
        this.observed_thead_tr = null;
    }
    
    attributeChangedCallback(name, old_value, new_value) {
        let func_name = `on_${name}_changed`;
        if (func_name in this) {
            this[func_name](old_value, new_value);
        }
    }
    
    async on_src_changed(old_value, new_value) {
        if (new_value) {
            let options = {
                method: this.method ?? 'GET'
            };
            
            let res = await fetch(this.src, options);
            if (! res.ok)
                throw `got response ${res.status} ${res.statusText}`;
            
            this.from(await res.json());
        }
    }
    
    get src() {
        return this.getAttribute('src');
    }
    
    set src(value) {
        this.setAttribute('src', value);
    }
    
    get header_row() {
        return this.tHead.querySelector('tr');
    }
    
    get column_names() {
        let names = [];
        for (let th of this.header_row.cells) {
            names.push(th.name);
        }
        
        return names;
    }
    
    get column_types() {
        let types = [];
        for (let th of this.header_row.cells) {
            types.push(th.type);
        }
        
        return types;
    }
    
    header(idx) {
        let result = this.tHead.querySelector('tr');
        if (idx != undefined) {
            result = result.children[idx];
        }
        return result;
    }
    
    data(row, column) {
        let tr;
        for (let tbody of this.tBodies) {
            if (row >= tbody.children.length) {
                row -= tbody.children.length;
            }
            else {
                tr = tbody.children[row];
            }
        }
        
        if (column != undefined) {
            let td = tr.children[column];
            return td.value;
        }
        else {
            let result = [];
            for (let td of tr.children) {
                result.push(td.value);
            }
            return result;
        }
    }
    
    to_array() {
        let result = [];
        
        for (let tbody of this.tBodies) {
            for (let row of tbody.rows) {
                let result_row = [];
                for (let cell of row.children) {
                    let v;
                    
                    let exporter = RenTableElement.exporters[cell.type];
                    if (exporter != undefined)
                        v = exporter(cell);
                    else
                        v = cell.value;
                    
                    result_row.push(v);
                }
                result.push(result_row);
            }
        }
        
        return result;
    }
    
    from(arr) {
        this.clear();
        
        let column_names = this.column_names;
        let column_types = this.column_types;
        
        let tbody = this.createTBody();
        for (let row of arr) {
            let tr = tbody.insertRow();
            
            if (row instanceof Array) {
                for (let idx in row) {
                    let td = document.createElement('td', {is: 'ren-td'});
                    let importer = RenTableElement.importers[column_types[idx]];
                    
                    if (importer)
                        td.value = importer(row[idx]);
                    else
                        td.value = row[idx] ?? '';
                    
                    tr.append(td);
                }
            }
            else {
                for (let idx in column_names) {
                    let td = document.createElement('td', {is: 'ren-td'});
                    let k = column_names[idx];
                    let importer = RenTableElement.importers[column_types[idx]];
                    
                    if (k != null) {
                        if (importer)
                            td.value = importer(row[k]);
                        else
                            td.value = row[k] ?? '';
                    }
                    
                    tr.append(td);
                }
            }
        }
    }
    
    clear() {
        for (let tbody of this.tBodies) {
            tbody.remove();
        }
    }
    
    update(
            row_start=0,
            column_start=0,
            row_end=Number.POSITIVE_INFINITY,
            column_end=Number.POSITIVE_INFINITY
    ) {
        let weight = Number(String(row_start) + String(column_start));
        let entry = {row_start, column_start, row_end, column_end};
        
        for (let idx=0;idx < this.update_regions.length;idx++) {
            let current_weight = Number(
                String(this.update_regions[idx].row_start) +
                String(this.update_regions[idx].column_start)
            );
            
            if (current_weight > weight) {
                this.update_regions.splice(
                    idx,
                    0,
                    entry
                );
                
                this.update_handle ??= setTimeout(
                    this._update.bind(this),
                    0,
                );
                
                return;
            }
        }
        
        this.update_regions.push(entry);
        this.update_handle ??= setTimeout(
            this._update.bind(this),
            0,
        );
    }
    
    _update() {
        this.update_handle = null;
        
        let rows = Array.from(this.tBodies).map(itm => itm.rows);
        rows = rows.flatMap(itm => Array.from(itm));
        
        for (let row_idx=0;row_idx < rows.length;row_idx++) {
            //remove passed regions
            while (this.update_regions.length > 0) {
                if (this.update_regions[0].row_end <= row_idx) {
                    this.update_regions.shift();
                }
                else {
                    break;
                }
            }
            
            if (this.update_regions.length == 0) {
                break;
            }
            
            if (this.update_regions[0].row_start > row_idx) {
                continue;
            }
            
            let cells = rows[row_idx].cells;
            for (let cell_idx=0;cell_idx < cells.length;cell_idx++) {
                for (let region of this.update_regions) {
                    if (region.row_start > row_idx) {
                        break;
                    }
                    
                    let in_region = (
                        region.column_start <= cell_idx &&
                        cell_idx < region.column_end
                    );
                    
                    if (in_region) {
                        cells[cell_idx].update();
                        break;
                    }
                }
            }
        }
        
        this.update_regions = [];
    }
    
    on_children_changed(mutations) {
        let new_thead = this.tHead;
        
        if (this.observed_thead != new_thead) {
            this.thead_observer.disconnect();
            this.observed_thead = new_thead;
            if (new_thead != null) {
                this.thead_observer.observe(new_thead, {childList: true});
                this.update();
            }
        }
    }
    
    on_thead_children_changed(mutations) {
        let new_thead_tr = this.header_row;
        if (new_thead_tr != this.observed_thead_tr) {
            this.thead_tr_observer.disconnect();
            this.observed_thead_tr = new_thead_tr;
            if (new_thead_tr != null) {
                this.thead_tr_observer.observe(new_thead_tr, {childList: true});
            }
            this.update();
        }
    }
    
    on_thead_tr_children_changed(mutations) {
        //initial update from +inf
        let first_prev_sibling_index = Number.POSITIVE_INFINITY;
        
        //find prev sibling of first removed elem
        for (let mutation of mutations) {
            let nodes = [...mutation.addedNodes, ...mutation.removedNodes];
            //check if added/removed is an element first. otherwise ignore
            if ( nodes.some( node => node.nodeType == Node.ELEMENT_NODE ) ) {
                //get previous element sibling
                let prev_sibling = mutation.previousSibling;
                if (prev_sibling != null && prev_sibling.nodeType != Node.ELEMENT_NODE) {
                    prev_sibling = prev_sibling.previousElementSibling;
                }
                
                //no prev sibling => removed first element. previous index = -1
                //update from beginning means no need to check other mutations
                if (prev_sibling == null) {
                    first_prev_sibling_index = -1;
                    break;
                }
                
                //store index if this index is before previous index
                let children = Array.from(mutation.target.children);
                let prev_sibling_index = children.indexOf(prev_sibling);
                first_prev_sibling_index = Math.min(first_prev_sibling_index, prev_sibling_index);
            }
        }
        
        //update from column after prev index until end of table
        let first_update_column = first_prev_sibling_index + 1;
        this.update(0, first_update_column);
    }
}

customElements.define('ren-table', RenTableElement, {extends: 'table'});

'use strict';

class RenHeaderElement extends HTMLTableCellElement {
    static observedAttributes = ["type"];
    
    constructor() {
        super();
    }
    
    get index() {
        return Array.prototype.indexOf.call(
            this.parentElement.children, this
        );
    }
    
    get type() {
        return this.getAttribute('type') ?? 'text';
    }
    
    set type(v) {
        this.setAttribute('type', v);
    }
    
    get name() {
        return this.getAttribute('name');
    }
    
    set name(v) {
        this.setAttribute('name', v);
    }
    
    attributeChangedCallback(name, new_value, old_value) {
        let func_name = `on_${name}_changed`;
        if (func_name in this) {
            this[func_name](old_value, new_value);
        }
    }
    
    on_type_changed(old_value, new_value) {
        let table = this.closest('table[is=ren-table]');
        table?.update(0, this.index, Number.POSITIVE_INFINITY, this.index + 1);
    }
}

customElements.define('ren-th', RenHeaderElement, {extends: 'th'});

'use strict';

class RenCellElement extends HTMLTableCellElement {
    static observedAttributes = ["value"];

    constructor() {
        super();
        
        this.update_handle = null;
    }
    
    attributeChangedCallback(name, old_value, new_value) {
        this.update();
    }
    
    get index() {
        return Array.prototype.indexOf.call(
            this.parentElement.children, this
        );
    }
    
    get value() {
        return this.getAttribute('value');
    }
    
    set value(v) {
        this.setAttribute('value', v);
    }
    
    get type() {
        return this.header.type ?? 'text';
    }
    
    get table() {
        return this.closest('table');
    }
    
    get header() {
        return this.table?.header(this.index);
    }
    
    update() {
        this.update_handle ??= setTimeout(this._update.bind(this));
    }
    
    _update() {
        this.update_handle = null;
        
        let renderer = RenTableElement.renderers[this.type];
        
        if (renderer != null) {
            renderer(this);
        }
        else {
            console.warn(
                `could not find renderer for type '${this.type}'.`,
                "will use value as text."
            );
            this.textContent = this.value;
        }
    }
}

customElements.define('ren-td', RenCellElement, {extends: 'td'});

