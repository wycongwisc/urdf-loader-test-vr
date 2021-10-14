import { createFileUploader } from "./src/inputAdders.js";
import { getWedModifiedURDF } from "./src/loaderHelper.js";
import { fetchFromURL } from "./src/helpers.js"

// let inputs = document.createElement('div');
// inputs.id = "inputs";
// document.body.appendChild(inputs);

// let robotLoader = createFileUploader("Upload Robot", [], true);
// robotLoader.onchange = () => {
//     if (robotLoader.files.length > 0) {
//         console.log("file detected");
//         getWedModifiedURDF(robotLoader.files);
//     }
// }

let url = "http://localhost:8000/movo_description/urdf/movo.urdf";
fetchFromURL(url);