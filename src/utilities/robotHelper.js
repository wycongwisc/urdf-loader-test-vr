export function recurseMaterialTraverse(material, func) {
    if (material.length > 1) {
        material.forEach(mat => {
            recurseMaterialTraverse(mat, func);
        })
    } else {
        func(material);
    }
}