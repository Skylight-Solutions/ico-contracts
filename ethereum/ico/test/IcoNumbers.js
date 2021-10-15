exports.Helper = {
    
    write(text) {
        console.log("text", text);
    }
}

exports.Constants = {
    InvestorCap: 500000,
    HardCap: 20000000,
    SoftCap: 5000000,
    Milestones: [
        { expectedTokenCount: 0, expectedPrice: 0.05 },
        { expectedTokenCount: 5000000, expectedPrice: 0.065 },
        { expectedTokenCount: 10000000, expectedPrice: 0.075 },
        { expectedTokenCount: 15000000, expectedPrice: 0.08 },
    ]
}