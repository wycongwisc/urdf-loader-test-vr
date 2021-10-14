import { fetchFromURL } from "../helpers.js";

// func acts on a blob
export function getWedModifiedURDF(files, func) {
    let fileArray = Array.from(files);
    let urdfFile = fileArray.find(file => file.webkitRelativePath.includes("/urdf/"));

    let urdfStr;
    let modifiedBlob;

    let createBlob = (text) => {
        var blob = new Blob([text], {
            type: 'text/plain'
        });
        return blob;
    }

    let fr = new FileReader();
    fr.onload = function () {
        urdfStr = fr.result;
        fileArray.forEach(file => {
            let path = file.webkitRelativePath;
            let tag = "";
            if (/\.stl$/i.test(path)) {
                tag = ".stlX"
            } else if (/\.dae$/i.test(path)) {
                tag = ".daeX"
            }
            let fileURL = URL.createObjectURL(file);
            let newLink = fileURL.substring(fileURL.lastIndexOf("/") + 1).trim() + tag;
            let replaceLink = "package://" + path;
            console.log(newLink);
            console.log(replaceLink);
            urdfStr = urdfStr.replace(replaceLink, newLink);
        })
        console.log(urdfStr);
        modifiedBlob = createBlob(urdfStr);
        func(modifiedBlob);
    }
    fr.readAsText(urdfFile);
}

// func acts on a blob
export function getURDFFromURL(link, func) {

    let createBlob = (text) => {
        var blob = new Blob([text], {
            type: 'text/plain'
        });
        return blob;
    }

    let extractFileLinks = (urdfBlob) => {
        let fetchCount = 0;
        let fr = new FileReader();
        fr.onload = function () {
            let urdfStr = fr.result;
            let parser = new DOMParser();
            let xml = parser.parseFromString(urdfStr,"text/xml");
            let meshes = Array.from(xml.getElementsByTagName("mesh"));
            // console.log(meshes);
            meshes.forEach(mesh => {
                let filePath = mesh.attributes.filename.nodeValue;
                let urdfFolder = link.substring(0, link.lastIndexOf("/"));
                let meshURL = mesh.attributes.filename.nodeValue.replace("package://", 
                    urdfFolder + "/../../");
                fetchFromURL(meshURL, (blob) => {
                    let tag = "";
                    if (/\.stl$/i.test(filePath)) {
                        tag = ".stlX"
                    } else if (/\.dae$/i.test(filePath)) {
                        tag = ".daeX"
                    }
                    let blobURL = URL.createObjectURL(blob);
                    let newLink = blobURL.substring(blobURL.lastIndexOf("/") + 1).trim() + tag;
                    let replaceLink = filePath;
                    urdfStr = urdfStr.replace(replaceLink, newLink);
                    fetchCount++;
                    if(fetchCount == meshes.length) {
                        let modifiedBlob = createBlob(urdfStr);
                        func(modifiedBlob);
                    }
                });
            })
        }
        fr.readAsText(urdfBlob);
    }

    fetchFromURL(link, extractFileLinks);
}