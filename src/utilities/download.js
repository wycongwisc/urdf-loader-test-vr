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