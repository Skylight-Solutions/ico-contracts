exports.Helper = {
    
    write(text) {
        console.log("text", text);
    }
}

exports.Constants = {
    Milestones: [
        { expectedTokenCount: 0, expectedPrice: 0.05 },
        { expectedTokenCount: 500000, expectedPrice: 0.06 },
        { expectedTokenCount: 1000000, expectedPrice: 0.065 },
        { expectedTokenCount: 1500000, expectedPrice: 0.08 },
    ]
}