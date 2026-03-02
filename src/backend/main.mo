import Runtime "mo:core/Runtime";

actor {
  public type HighScore = {
    bestNight : Nat;
    bestTime : Nat; // time in seconds
  };

  var current : HighScore = {
    bestNight = 0;
    bestTime = 0;
  };

  public shared ({ caller }) func saveHighScore(bestNight : Nat, bestTime : Nat) : async () {
    if (bestNight == 0 or bestNight > 5) { Runtime.trap("Invalid night number. Must be between 1 and 5.") };

    let newHighScoreIsNight = bestNight > current.bestNight;
    let sameNightButBetterTime = bestNight == current.bestNight and bestTime > current.bestTime;

    if (newHighScoreIsNight or sameNightButBetterTime) {
      current := {
        bestNight;
        bestTime;
      };
    };
  };

  public query ({ caller }) func getHighScore() : async HighScore {
    current;
  };

  public shared ({ caller }) func resetHighScore() : async () {
    current := {
      bestNight = 0;
      bestTime = 0;
    };
  };
};
