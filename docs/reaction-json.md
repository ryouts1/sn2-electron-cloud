# Reaction JSON schema

この版では、**SN2 family のうち、いまの幾何生成器で無理なく扱える範囲** に限って reaction JSON を読み込めます。任意分子の自動構築器ではありません。

## 対応範囲

- `family`
  - `methyl-sn2`
  - `primary-sn2`
- `substrate.type`
  - `methyl`
  - `ethyl`
- nucleophile は単一重原子 `Nu` + 任意の `Nu–H` spectator 0〜3 本
- leaving group は単一重原子 `X`
- 対応元素は `H / C / N / O / F / S / Cl / Br / I`

## トップレベル形式

次の 2 形式を受け付けます。

1. object-form

```json
{
  "schemaVersion": 1,
  "name": "Custom SN2 reactions",
  "reactions": [
    {
      "id": "example-fi",
      "family": "methyl-sn2",
      "title": "F⁻ + CH₃I → CH₃F + I⁻",
      "substrateLabel": "methyl iodide",
      "productLabel": "fluoromethane + iodide",
      "totalCharge": -1,
      "nucleophile": {
        "element": "F",
        "distances": {
          "reactant": 3.1,
          "transition": 2.05,
          "product": 1.38
        }
      },
      "leavingGroup": {
        "element": "I",
        "distances": {
          "reactant": 2.14,
          "transition": 2.05,
          "product": 4.35
        }
      }
    }
  ]
}
```

2. array-form

```json
[
  {
    "id": "example-array-nh2-br",
    "family": "methyl-sn2",
    "title": "NH₂⁻ + CH₃Br → CH₃NH₂ + Br⁻",
    "substrateLabel": "methyl bromide",
    "productLabel": "methylamine + bromide",
    "totalCharge": -1,
    "nucleophile": {
      "element": "N",
      "hydrogens": {
        "count": 2,
        "bondLength": 1.01,
        "polarAngleDeg": 107,
        "azimuthDegs": [60, -60]
      },
      "distances": {
        "reactant": 3.2,
        "transition": 2.18,
        "product": 1.47
      }
    },
    "leavingGroup": {
      "element": "Br",
      "distances": {
        "reactant": 1.94,
        "transition": 2.18,
        "product": 4.05
      }
    }
  }
]
```

## 必須項目

- `id`
- `family`
- `title`
- `substrateLabel`
- `productLabel`
- `totalCharge`
- `nucleophile.element`
- `nucleophile.distances.reactant / transition / product`
- `leavingGroup.element`
- `leavingGroup.distances.reactant / transition / product`

## optional だが使う項目

- `familyLabel`
- `shortTitle`
- `description`
- `substrate.type`
- `substrate.label`
- `substrate.alphaHydrogenBondLength`
- `substrate.betaCarbonBondLength`
- `substrate.betaHydrogenBondLength`
- `nucleophile.symbol / display / atomLabel / productFragment`
- `nucleophile.hydrogens`

## 同梱している example JSON

- `examples/reactions/minimal-single-reaction.json`
- `examples/reactions/custom-sn2-library.json`
- `examples/reactions/halide-leaving-group-comparison.json`
- `examples/reactions/donor-family-comparison.json`
- `examples/reactions/primary-substrate-series.json`
- `examples/reactions/array-format-example.json`

それぞれの用途は `examples/reactions/README.md` を見れば分かるようにしてあります。

## 近似モデルとの関係

読み込んだ JSON は、見た目だけ差し替えるものではありません。reaction path と電子数、basis set、reactive projector の対象原子がそこから組み立てられます。

ただし、**量子化学本体は引き続き extended Hückel + minimal Gaussian basis** です。JSON を追加しても、ab initio の任意反応計算になるわけではありません。
