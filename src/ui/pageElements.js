
class Element {
    constructor(name, domParent) {
        this.name = name;
        this.div = document.createElement('div');
        this.div.id = name.replace(" ","-") + "-div";
        this.div.classList.add("elementDiv");
        this.id = name.replace(" ","-");
        this.domParent = document.getElementById(domParent);
        this.elements = [];
        this.endBreak = document.createElement("BR");
        this.domParent.appendChild(this.div);

        this.label = document.createElement("label");
        this.label.id = name.replace(" ","-");
        this.label.innerHTML = name;
    }

    createLineBreak() {
        return document.createElement("BR");
    }

    addElements() {
        this.elements.forEach(element => {
            this.div.appendChild(element);
        })
    }

    removeDiv() {
        this.div.remove();
    }

    addDiv() {
        this.domParent.appendChild(this.div);
    }

    removeElement(index) {
        this.elements[index].remove();
        this.elements.splice(index, 1);
    }

    addElement(element) {
        this.elements.push(element);
        this.domParent.appendChild(element);
    }

    addClass(className) {
        this.div.classList.add(className);
    }
}

export class Container {
    constructor(id, domParent, vertical = false) {
        this.div = document.createElement('div');
        this.div.id = id;
        if(vertical) {
            this.div.classList.add("verticalContainer");
        } else {
            this.div.classList.add("horizontalContainer");
        }
        this.domParent = document.getElementById(domParent);
        this.domParent.appendChild(this.div);
    }

    addBlock() {
        let args = Array.prototype.slice.call(arguments);
        for(let i = 0; i < args.length; i++) {
            let element = args[i];
            element.div.remove();
            this.div.appendChild(element.div);
        }
    }

    removeDiv() {
        this.div.remove();
    }

    addDiv() {
        this.domParent.appendChild(this.div);
    }

    addClass(className) {
        this.div.classList.add(className);
    }
}

export class Slider extends Element {
    constructor(name, domParent, min, max, step, value) {
        super(name, domParent);

        this.slider = document.createElement("input");
        this.slider.setAttribute("type", "range");
        this.slider.setAttribute("min", min);
        this.slider.setAttribute("max", max);
        this.slider.setAttribute("step", step);
        this.slider.setAttribute("value", value);
        this.slider.id = name.replace(" ","-") + "-slider";

        this.elements.push(this.label);
        this.elements.push(this.createLineBreak());
        this.elements.push(this.slider);
        // this.elements.push(this.endBreak);

        this.addElements();
    }
}

export class Checkbox extends Element {
    constructor(name, domParent, value = false) {
        super(name, domParent);

        this.checkbox = document.createElement("input");
        this.checkbox.setAttribute("type", "checkbox");
        this.checkbox.checked = value;
        this.checkbox.id = name.replace(" ","-") + "-check";

        this.leftCheckDiv = document.createElement("div");
        this.leftCheckDiv.appendChild(this.label);

        this.rightCheckDiv = document.createElement("div");
        this.rightCheckDiv.appendChild(this.checkbox);

        this.div.classList.add("checkDiv");

        this.elements.push(this.leftCheckDiv);
        this.elements.push(this.rightCheckDiv);
        // this.elements.push(this.endBreak);

        this.addElements();
    }
}

export class Select extends Element {
    constructor(name, domParent, options = []) {
        super(name, domParent);

        this.select = document.createElement("select");
        this.select.id = name.replace(" ","-") + "-select"

        this.options = options;
        this.selectOptions = [];
        for (let i = 0; i < options.length; i++) {
            let option = document.createElement("option");
            option.text = this.options[i][0];
            option.value = this.options[i][1];
            this.selectOptions.push(option);
            this.select.appendChild(option);
        }

        this.elements.push(this.label);
        this.elements.push(this.createLineBreak());
        this.elements.push(this.select);
        // this.elements.push(this.endBreak);

        this.addElements();
    }

    addOption(option) {
        this.options.push(option);
        let newOption = document.createElement("option");
        newOption.text = option[0];
        newOption.value = option[1];
        this.selectOptions.push(newOption);
        this.select.appendChild(newOption);
    }

    removeOption(option) {
        let optionIndex = this.selectOptions.findIndex(opt => opt[0] == option[0]);
        selectOptions[optionIndex].remove();
        this.selectOptions.splice(optionIndex, 1);
        this.options.splice(optionIndex, 1);
    }

    getSelected() {
        return this.options[this.select.selectedIndex][1];
    }

    getSelectedIndex() {
        return this.select.selectedIndex;
    }
}

export class TextInput extends Element {
    constructor(name, domParent) {
        super(name, domParent);

        this.textInput = document.createElement("input");
        this.textInput.setAttribute("type", "text");
        this.textInput.id = name.replace(" ","-") + "-text";

        this.elements.push(this.label);
        this.elements.push(this.createLineBreak());
        this.elements.push(this.textInput);
        // this.elements.push(this.endBreak);

        this.addElements();
    }
}

export class Button extends Element {
    constructor(name, domParent, func) {
        super(name, domParent);

        this.button = document.createElement("button");
        this.button.innerHTML = name;
        this.button.id = name.replace(" ","-") + "-button";
        this.button.addEventListener("click", func);

        this.elements.push(this.button);
        // this.elements.push(this.endBreak);
        
        this.addElements();
    }
}

export class FileUploader extends Element {
    constructor(name, domParent, acceptTypes, includeDir = false) {
        super(name, domParent);

        this.fileUploader = document.createElement("input");
        this.fileUploader.setAttribute("type", "file");
        this.fileUploader.id = name.replace(" ","-") + "-uploader"
        this.fileUploader.onclick = () => {
            this.fileUploader.value = null;
        }

        this.acceptTypes = acceptTypes;
        this.includeDir = includeDir;
    
        if(acceptTypes.length > 0) {
            this.fileUploader.setAttribute("accept", acceptTypes.join(', '));
        }
    
        if (includeDir) {
            this.fileUploader.setAttribute("webkitdirectory", "");
        }

        this.elements.push(this.label);
        this.elements.push(this.createLineBreak());
        this.elements.push(this.fileUploader);
        // this.elements.push(this.endBreak);

        this.addElements();
    }

    getFiles() {
        return this.fileUploader.files;
    }
}