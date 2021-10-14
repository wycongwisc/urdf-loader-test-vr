
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

// https://stackoverflow.com/questions/44070437/how-to-get-a-file-or-blob-from-an-url-in-javascript
export function fetchFromURL(url, func) {
    fetch(url)
        .then(res => res.blob()) // Gets the response and returns it as a blob
        .then(blob => {
            // temp
            func(blob);
        }
    );
}

// t should be between 0 and 1
export function lerp(a, b, t) {
    return a + (b - a) * t;
}