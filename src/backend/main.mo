
import Runtime "mo:core/Runtime";


actor {
  public type HighScore = {
    bestNight : Nat;
    bestTime : Nat; // time in seconds
  };

  var normal : HighScore = {
    bestNight = 0;
    bestTime = 0;
  };
  var nightmare : HighScore = {
    bestNight = 0;
    bestTime = 0;
  };

  public shared ({ caller }) func saveHighScore(bestNight : Nat, bestTime : Nat) : async () {
    saveScoreInternal(bestNight, bestTime, func(newScore) { normal := newScore });
  };

  public query ({ caller }) func getHighScore() : async HighScore {
    normal;
  };

  public shared ({ caller }) func resetHighScore() : async () {
    normal := {
      bestNight = 0;
      bestTime = 0;
    };
  };

  public shared ({ caller }) func saveNightmareScore(bestNight : Nat, bestTime : Nat) : async () {
    saveScoreInternal(bestNight, bestTime, func(newScore) { nightmare := newScore });
  };

  public query ({ caller }) func getNightmareScore() : async HighScore {
    nightmare;
  };

  public shared ({ caller }) func resetNightmareScore() : async () {
    nightmare := {
      bestNight = 0;
      bestTime = 0;
    };
  };

  func saveScoreInternal(bestNight : Nat, bestTime : Nat, update : HighScore -> ()) {
    if (bestNight == 0 or bestNight > 5) { Runtime.trap("Invalid night number. Must be between 1 and 5.") };

    let currentScore = normal; // Reuse normal score for comparison

    let isBetterNight = bestNight > currentScore.bestNight;
    let isSameNightBetterTime = bestNight == currentScore.bestNight and bestTime > currentScore.bestTime;

    if (isBetterNight or isSameNightBetterTime) {
      let newScore = { bestNight; bestTime };
      update(newScore);
    };
  };
};
