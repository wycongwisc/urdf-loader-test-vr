export default function download(content, filename, type='string') {

    // https://github.com/mrdoob/three.js/blob/master/examples/misc_exporter_gltf.html

    const blob = (type === 'string') ? new Blob([content], { type: 'text/plain' }, filename)
               : (type === 'arrayBuffer') ? new Blob([content], { type: 'application/octet-stream' }, filename)
               : undefined;
    
    const link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link);

    link.href = URL.createObjectURL( blob );
    link.download = filename;
    link.click();
}

// also parses .rmoo
export function parseCSV(file, func) {
    let arr;
    let fr = new FileReader();
    fr.onload = function () {
        let data = fr.result;
        arr = data.split(/\r\n|\n/).map((line) => {
            return line.split(/,|;/);
        })
        // console.log(arr[0]);
        func(arr);
    }
    fr.readAsText(file);
}

// https://stackoverflow.com/questions/45611674/export-2d-javascript-array-to-excel-sheet
export function exportToCsv(data, filename) {
    let str = "";
    data.forEach((row) => {
        for (let i = 0; i < row.length - 1; i++) {
            str += row[i] + ",";
        }
        str += row[row.length - 1] + "\r\n";
    });
    str = "data:application/csv," + encodeURIComponent(str);
    let x = document.createElement("A");
    x.setAttribute("href", str);
    x.setAttribute("download", filename);
    document.body.appendChild(x);
    x.click();
}
