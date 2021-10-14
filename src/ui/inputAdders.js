export function onWindowOnload(newFunction) {
    let oldFunction = window.onload;
    window.onload = function (ev) {
        if (oldFunction)
            oldFunction.apply(window, ev);
        newFunction();
    };
}

export function createSlider(name, domParent, min, max, step, value) {
    let slider = document.createElement("input");
    slider.setAttribute("type", "range");
    slider.setAttribute("min", min);
    slider.setAttribute("max", max);
    slider.setAttribute("step", step);
    slider.setAttribute("value", value);
    slider.id = name + "-slider";

    let label = document.createElement("span");
    label.id = name + "-slider-label";
    label.innerHTML = name + ": " + value;

    document.getElementById(domParent).appendChild(label);
    document.getElementById(domParent).appendChild(document.createElement("BR"));
    document.getElementById(domParent).appendChild(slider);
    document.getElementById(domParent).appendChild(document.createElement("BR"));
    return [slider, label];
}

export function createCheckbox(name, domParent, value) {
    let checkbox = document.createElement("input");
    checkbox.setAttribute("type", "checkbox");
    checkbox.checked = value;

    checkbox.id = name + "-check";

    let label = document.createElement("span");
    label.id = name + "-label";
    label.innerHTML = name;

    document.getElementById(domParent).appendChild(label);
    document.getElementById(domParent).appendChild(checkbox);
    document.getElementById(domParent).appendChild(document.createElement("BR"));

    return checkbox;
}

export function createSelect(name, text, domParent, options) {
    let select = document.createElement("select");

    select.id = name + "-select"

    let label = document.createElement("span");
    label.id = name + "-label";
    label.innerHTML = text;

    if (options) {
        for (let i = 0; i < options.length; i++) {
            let option = document.createElement("option");
            option.value = options[i];
            option.text = options[i];
            select.appendChild(option)
        }
    }

    document.getElementById(domParent).appendChild(label);
    document.getElementById(domParent).appendChild(document.createElement("BR"));
    document.getElementById(domParent).appendChild(select);
    document.getElementById(domParent).appendChild(document.createElement("BR"));

    return select;
}

export function createTextInput(name, domParent) {
    let text = document.createElement("input");
    text.setAttribute("type", "text");

    text.id = name + "-text";

    let label = document.createElement("span");
    label.id = name + "-label";
    label.innerHTML = name;

    document.getElementById(domParent).appendChild(label);
    document.getElementById(domParent).appendChild(document.createElement("BR"));
    document.getElementById(domParent).appendChild(text);
    document.getElementById(domParent).appendChild(document.createElement("BR"));

    return text;
}

export function createButton(name, domParent, label, func) {
    let button = document.createElement("button");

    button.innerHTML = label;
    button.id = name + "-button";

    button.addEventListener("click", func);

    document.getElementById(domParent).appendChild(button);
    document.getElementById(domParent).appendChild(document.createElement("BR"));

    return button;
}

export function createFileUploader(name, domParent, acceptTypes, includeDir = false) {
    let fileUploader = document.createElement("input");
    fileUploader.setAttribute("type", "file");

    if(acceptTypes.length > 0) {
        fileUploader.setAttribute("accept", acceptTypes.join(', '));
    }

    if (includeDir) {
        fileUploader.setAttribute("webkitdirectory", "");
    }

    fileUploader.id = name + "-uploader"

    let label = document.createElement("span");
    label.id = name + "-label";
    label.innerHTML = name;

    document.getElementById(domParent).appendChild(label);
    document.getElementById(domParent).appendChild(document.createElement("BR"));
    document.getElementById(domParent).appendChild(fileUploader);
    document.getElementById(domParent).appendChild(document.createElement("BR"));

    fileUploader.onclick = () => {
        fileUploader.value = null;
    }
    return fileUploader;
}

export function createCanvas(name, domParent) {
    let canvas = document.createElement('canvas');

    canvas.id = name + "-canvas";

    document.getElementById(domParent).appendChild(canvas);

    return canvas;
}

export function createText(txt, domParent, type) {
    let paragraph  = document.createElement(type);
    let text = document.createTextNode(txt);

    paragraph.appendChild(text);
    document.getElementById(domParent).appendChild(paragraph);
}

export function createSwitch(txt, domParent, type) {
    let paragraph  = document.createElement(type);
    let text = document.createTextNode(txt);

    paragraph.appendChild(text);
    document.getElementById(domParent).appendChild(paragraph);
}

export function createDiv(domParent, name, txt) {
    let  div = document.createElement('div');
    if (name) div.id = name + '-div';
    if (txt) div.innerHTML  = txt;
    document.getElementById(domParent).appendChild(div);
    return div;
}

export function createBr(domParent) {
    let  br = document.createElement('br');
    document.getElementById(domParent).appendChild(br);
    return br;
}

export function createToggleSwitch(name, domParent, leftTxt, rightTxt, value) {

    let tb = document.createElement('table');
    tb.classList.add("toggleTable");
    let tbdy = document.createElement('tbody');
    let tr = document.createElement('tr');

    let left = document.createElement('td');
    left.appendChild(document.createTextNode(leftTxt));
    tr.appendChild(left)

    let middle = document.createElement('td');
    let toggleSwitch = document.createElement("label");
    toggleSwitch.classList.add("switch");

    let checkbox = document.createElement("input");
    checkbox.id = name + "-toggle";
    checkbox.setAttribute("type", "checkbox");
    checkbox.checked = value;
    
    let span = document.createElement("span");
    span.classList.add("slider");
    span.classList.add("round");

    toggleSwitch.appendChild(checkbox);
    toggleSwitch.appendChild(span);

    // document.getElementById(domParent).appendChild(toggleSwitch);
    middle.appendChild(toggleSwitch);
    tr.appendChild(middle)

    let right = document.createElement('td');
    right.appendChild(document.createTextNode(rightTxt));
    tr.appendChild(right)

    tbdy.appendChild(tr);
    tb.appendChild(tbdy);
    document.getElementById(domParent).appendChild(tb);

    return toggleSwitch;
}
