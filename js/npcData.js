const NPC_DATA = Object.freeze({
    stationmasters: [
        { id: "marina", name: "Captain Marina", title: "Coal Harbor Stationmaster", specialty: "FREIGHT", badge: "Harbor Badge", roster: [[13, 12], [14, 14], [15, 16]], dialogue: { intro: "Coal built this region, and freight keeps it moving. Show me your hauling power!", defeat: "You carry victory well. Take the Harbor Badge." } },
        { id: "volta", name: "Chief Volta", title: "Copper Junction Stationmaster", specialty: "ELECTRIC", badge: "Circuit Badge", roster: [[28, 19], [29, 21], [30, 23]], dialogue: { intro: "Every signal answers to me. Can you outrun the current?", defeat: "Your timing is electric. The Circuit Badge is yours." } },
        { id: "gauge", name: "Foreman Gauge", title: "Ironworks Stationmaster", specialty: "DIESEL", badge: "Torque Badge", roster: [[34, 25], [35, 27], [36, 29]], dialogue: { intro: "These rails were forged under pressure. Let's test your engine!", defeat: "Solid work. You've earned the Torque Badge." } },
        { id: "flora", name: "Gardener Flora", title: "Verdant Platform Stationmaster", specialty: "PASSENGER", badge: "Garden Badge", roster: [[22, 30], [23, 31], [24, 33]], dialogue: { intro: "A railway must serve the land it crosses. Tread carefully.", defeat: "You found a path through every obstacle. Accept the Garden Badge." } },
        { id: "monroe", name: "Director Monroe", title: "Skybeam Stationmaster", specialty: "MONORAIL", badge: "Beam Badge", roster: [[91, 35], [92, 36], [93, 38], [94, 40]], dialogue: { intro: "One beam. One route. Absolute balance.", defeat: "Your focus never wavered. Take the Beam Badge." } },
        { id: "nova", name: "Dr. Nova", title: "Isotope City Stationmaster", specialty: "NUCLEAR", badge: "Core Badge", roster: [[65, 40], [66, 42], [137, 43], [139, 45]], dialogue: { intro: "Power demands discipline. Prove you can contain yours.", defeat: "Stable under pressure. The Core Badge belongs with you." } },
        { id: "aero", name: "Pilot Aero", title: "Velocity Terminal Stationmaster", specialty: "MAGLEV", badge: "Velocity Badge", roster: [[31, 43], [32, 45], [69, 46], [72, 48]], dialogue: { intro: "Friction is hesitation made physical. Leave both behind!", defeat: "You crossed the line before doubt arrived. Take the Velocity Badge." } },
        { id: "sterling", name: "Magnate Sterling", title: "Crown Central Stationmaster", specialty: "PASSENGER", badge: "Crown Badge", roster: [[107, 47], [108, 49], [109, 51], [110, 53], [147, 55]], dialogue: { intro: "A great conductor commands power, grace, and responsibility. Demonstrate all three.", defeat: "The network recognizes you. Take the Crown Badge and proceed to Terminus." } }
    ],
    eliteConductors: [
        { id: "brass", name: "Conductor Brass", specialty: "FREIGHT", roster: [[54, 54], [77, 55], [82, 56], [142, 57], [150, 59]], dialogue: { intro: "The weight of history rides behind every engine.", defeat: "You did not buckle beneath it." } },
        { id: "aurora", name: "Conductor Aurora", specialty: "ELECTRIC", roster: [[30, 56], [57, 56], [136, 57], [139, 58], [145, 60]], dialogue: { intro: "Signals become stars when the night is dark enough.", defeat: "Your light reached the final platform." } },
        { id: "vector", name: "Conductor Vector", specialty: "MAGLEV", roster: [[33, 57], [62, 58], [63, 58], [67, 60], [72, 62]], dialogue: { intro: "Direction without purpose is merely speed.", defeat: "Your purpose is unmistakable." } },
        { id: "radia", name: "Conductor Radia", specialty: "NUCLEAR", roster: [[65, 59], [66, 60], [148, 61], [149, 62], [150, 64]], dialogue: { intro: "At the heart of every machine waits a choice: control or catastrophe.", defeat: "You chose control." } }
    ],
    champion: { id: "champion_cypress", name: "Champion Cypress", roster: [[3, 62], [6, 62], [9, 62], [72, 64], [150, 65], [151, 67]], dialogue: { intro: "I taught you how to begin. Now show me how far the rails have carried you.", defeat: "The Grand Transit has its new Champion." } },
    rival: { id: "rival_axel", name: "Axel", rosters: [[[4, 5]], [[5, 18], [20, 17]], [[6, 32], [36, 30], [57, 30]], [[6, 48], [36, 46], [57, 46], [99, 47], [140, 48]], [[6, 61], [36, 59], [57, 59], [99, 60], [140, 60], [151, 63]]], dialogue: { intro: "I'm taking the express route to the top!", defeat: "Fine. Next time, I'm leaving you at the platform." } },
    teamDerail: [
        { id: "grunt_switch", name: "Derail Grunt Switch", roster: [[23, 14], [27, 15]], dialogue: "Team Derail owns this junction now!" },
        { id: "grunt_spike", name: "Derail Grunt Spike", roster: [[40, 22], [49, 23]], dialogue: "One loose spike can stop an empire." },
        { id: "grunt_smoke", name: "Derail Grunt Smoke", roster: [[26, 30], [51, 31], [79, 32]], dialogue: "We'll cloud every signal in the region!" },
        { id: "admin_wreck", name: "Admin Wreck", roster: [[54, 42], [66, 43], [115, 45], [143, 46]], dialogue: "Order made the rails weak. We bring beautiful chaos." }
    ]
});

if (typeof module !== "undefined" && module.exports) module.exports = NPC_DATA;
