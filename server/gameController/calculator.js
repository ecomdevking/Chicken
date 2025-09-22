function AnalysisBetStatus(betResult, betAmount, betLevel, betSteps, totalBetAmount){
    const betOdd = SelectLevel(betLevel, betSteps);
    if(betResult === "win"){
        const winAmount = betAmount * SelectLevel(betLevel, betSteps);
        return {totalAmount: totalBetAmount + winAmount, winAmount};
        // Update user balance or perform other win-related actions
    } else{
        const lossAmount = betAmount;
        return {totalAmount: totalBetAmount - lossAmount, lossAmount};
        // Update user balance or perform other lose-related actions
    }
}

// Calculate bet odds based on Levels and betSteps

function SelectLevel(betLevel, betSteps){
    let betOdd;
    if(betLevel === "low"){
        betOdd = valueLowLevel(betSteps);
    }
    else if(betLevel === "medium"){
        betOdd = ValueMediumLevel(betSteps);
    }
    else if(betLevel === "high"){
        betOdd = ValueHighLevel(betSteps);
    }
    return betOdd;

}
// Exact odd values for each level based on provided arrays

// Low level odds array (49 values)
const lowLevelOdds = [
    1.02, 1.08, 1.13, 1.19, 1.25, 1.32, 1.38, 1.45, 1.53, 1.61,
    1.69, 1.78, 1.87, 1.96, 2.06, 2.17, 2.28, 2.4, 2.52, 2.65,
    2.78, 2.92, 3.07, 3.23, 3.4, 3.57, 3.75, 3.94, 4.14, 4.36,
    4.58, 4.81, 5.06, 5.32, 5.59, 5.87, 6.17, 6.49, 6.82, 7.17,
    7.53, 7.92, 8.32, 8.75, 9.19, 9.66, 10.16, 10.67, 11.22
];

// Medium level odds array (49 values)
const mediumLevelOdds = [
    1.12, 1.28, 1.46, 1.67, 1.91, 2.18, 2.49, 2.85, 3.25, 3.72,
    4.25, 4.86, 5.56, 6.35, 7.26, 8.3, 9.48, 10.84, 12.39, 14.16,
    16.18, 18.49, 21.13, 24.15, 27.6, 31.55, 36.05, 41.2, 47.09, 53.82,
    61.51, 70.3, 80.34, 91.82, 104.94, 119.93, 137.06, 156.64, 179.02, 204.59,
    233.82, 267.23, 305.4, 349.03, 398.89, 455.88, 521.01, 595.44, 680.5
];

// High level odds array (49 values)
const highLevelOdds = [
    1.22, 1.54, 1.93, 2.43, 3.05, 3.83, 4.8, 6.03, 7.57, 9.5,
    11.93, 14.97, 18.79, 23.59, 29.6, 37.16, 46.64, 58.53, 73.47, 92.21,
    115.74, 145.26, 182.32, 228.83, 287.21, 360.47, 452.43, 567.85, 712.71, 894.53,
    1122.73, 1409.14, 1768.61, 2219.79, 2786.07, 3496.8, 4388.84, 5508.45, 6913.66, 8677.35,
    10669.27, 17156.33, 21532.95, 27026.05, 33920.45, 42573.63, 53434.25, 67065.44
];

function valueLowLevel(n) {
    if(n > lowLevelOdds.length) return lowLevelOdds[lowLevelOdds.length - 1]; // Return last value if beyond array
    return lowLevelOdds[n - 1]; // n-1 because array is 0-indexed and n starts from 1
}

function ValueMediumLevel(n) {
    if(n > mediumLevelOdds.length) return mediumLevelOdds[mediumLevelOdds.length - 1]; // Return last value if beyond array
    return mediumLevelOdds[n - 1]; // n-1 because array is 0-indexed and n starts from 1
}

function ValueHighLevel(n) {
    if(n > highLevelOdds.length) return highLevelOdds[highLevelOdds.length - 1]; // Return last value if beyond array
    return highLevelOdds[n - 1]; // n-1 because array is 0-indexed and n starts from 1
}

module.exports = {
  AnalysisBetStatus,
  SelectLevel,
  valueLowLevel,
  ValueMediumLevel,
  ValueHighLevel
}