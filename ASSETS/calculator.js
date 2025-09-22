
function valueAt(n) {
    if(n === 1) return 1;
    const r = Math.pow(11, 1/50);
    return Math.round(1.02 * Math.pow(r, n-2) * 100) / 100;
}

function generate(N){
    return Array.from({length: N}, (_, i) => valueAt(i + 1));
}

console.log(generate(50));