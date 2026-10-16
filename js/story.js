const STORY_EVENTS = Object.freeze([
    { id: "choose_starter", requires: [], trigger: { map: "PistonTown", x: 10, y: 8 }, dialogue: ["Professor Cypress: The Grand Transit is failing. Choose a partner and carry this Railpass to Crown Central.", "Blake: Pick quickly. I'm already one station ahead."], sets: "hasStarter" },
    { id: "rival_departure", requires: ["hasStarter"], trigger: { map: "PistonTown", x: 10, y: 14 }, battle: "rival_blake:0", sets: "rival1Defeated" },
    { id: "derail_switchyard", requires: ["Circuit Badge"], trigger: { map: "Route3", x: 10, y: 12 }, dialogue: ["Team Derail has reversed the points! No train can reach Ironworks."], battle: "grunt_switch", sets: "switchyardCleared" },
    { id: "stolen_manifest", requires: ["Torque Badge"], trigger: { map: "City4", x: 9, y: 7 }, dialogue: ["The regional manifest is gone. Without it, trains are vanishing from every timetable."], battle: "grunt_spike", sets: "manifestRecovered" },
    { id: "blackout", requires: ["Beam Badge"], trigger: { map: "Route6", x: 10, y: 10 }, dialogue: ["Team Derail overloaded the Isotope signal grid. Reach the control room before the core trips."], battle: "grunt_smoke", sets: "gridRestored" },
    { id: "derail_hq", requires: ["Core Badge", "gridRestored"], trigger: { map: "Route7", x: 10, y: 16 }, dialogue: ["Admin Wreck: We will uncouple every city and rule the wreckage."], battle: "admin_wreck", sets: "derailDefeated" },
    { id: "final_rival", requires: ["Crown Badge", "derailDefeated", "steamPunkDefeated"], trigger: { map: "GrandTerminus", x: 6, y: 26 }, battle: "rival_blake:4", sets: "rivalFinalDefeated" },
    { id: "league", requires: ["rivalFinalDefeated"], trigger: { map: "GrandTerminus", x: 6, y: 2 }, dialogue: ["Eight badges open the Grand Gate. Four Conductors and the Champion await."], sets: "leagueOpen" },
    { id: "champion", requires: ["defeated_radia"], trigger: { map: "GrandTerminus", x: 6, y: 4 }, battle: "champion_cypress", sets: "gameComplete" },
    { id: "credits", requires: ["gameComplete"], trigger: { map: "GrandTerminus", x: 6, y: 4 }, dialogue: ["The Grand Transit is whole again.", "CREDITS - The rails continue wherever you choose to travel."], sets: "creditsSeen" },
    { id: "epilogue", requires: ["creditsSeen"], trigger: { map: "PistonTown", x: 10, y: 8 }, dialogue: ["The network is whole again. Every whistle across the region salutes its new Champion."], sets: "epilogueSeen" },
    { id: "postgame", requires: ["epilogueSeen"], trigger: { map: "GrandTerminus", x: 10, y: 3 }, dialogue: ["Old Iron is ready for a rematch. Legendary trains have returned to their known habitats."], sets: "postgameUnlocked" }
]);

function availableStoryEvents(flags, map, x, y) {
    return STORY_EVENTS.filter(event => !flags[event.sets] && event.trigger.map === map && event.trigger.x === x && event.trigger.y === y && event.requires.every(flag => flags[flag]));
}

if (typeof module !== "undefined" && module.exports) module.exports = { STORY_EVENTS, availableStoryEvents };
