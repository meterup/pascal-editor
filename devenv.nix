{ pkgs, inputs, ... }:

let
  packageJSON = builtins.fromJSON (builtins.readFile ./package.json);

  bunVersion =
    let
      # Corepack writes `packageManager` with an optional integrity suffix
      # (`bun@1.3.0+sha512.<digest>`) that isn't part of the release number.
      parsed = builtins.match "bun@([^+]+).*" packageJSON.packageManager;
    in
    if parsed == null then
      throw (
        builtins.concatStringsSep " " [
          "devenv.nix: expected `packageManager` in package.json"
          "to name bun, got `${packageJSON.packageManager}`."
        ]
      )
    else
      builtins.head parsed;

  bunPkgs = import inputs.nixpkgs-bun { inherit (pkgs.stdenv) system; };

  # The `nixpkgs-bun` pin and `packageManager` have to move together. Throwing
  # on a mismatch keeps nix from silently handing over a different bun than the
  # one the repo declares, which would otherwise surface only as behaviour that
  # disagrees with CI.
  bun =
    if bunPkgs.bun.version == bunVersion then
      bunPkgs.bun
    else
      throw (
        builtins.concatStringsSep " " [
          "devenv.nix: package.json asks for bun ${bunVersion} but the pinned"
          "`nixpkgs-bun` is at ${bunPkgs.bun.version}. Repoint that input at a"
          "revision holding bun ${bunVersion} (https://www.nixhub.io/packages/bun"
          "lists them). Update `nixpkgs-bun` in devenv.yaml with the correct SHA."
         ]
      );
in
{
  languages.javascript = {
    enable = true;

    # Not `-slim` since publish-fork.ts uses `npm`
    package = pkgs.nodejs_22;
    npm.enable = true;

    bun = {
      enable = true;
      package = bun;

      install.enable = false;
    };
  };
}
