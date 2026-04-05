# Test plan

## Automated tests

### `tests/gaussianBasis.test.js`

- 16 個の価電子基底が正しく生成される
- 各 Gaussian basis function の自己重なりが 1 に近い

### `tests/reactionPath.test.js`

- 反応物側・生成物側の O···C / C···Cl 距離
- TS 側で O···C と C···Cl が対称になること
- CH₃ の反転座標が符号反転すること

### `tests/extendedHuckel.test.js`

- `Tr(PS)` による 22 電子保存
- 総電荷 -1
- HOMO / LUMO の順序
- O–C 形成と C–Cl 切断が overlap population に反映されること

### `tests/sampler.test.js`

- 3D グリッド積分が 22 電子に近いこと
- difference density の体積積分がおおむね 0 に近いこと

## Manual checks in browser

1. `valence-density` で q を 0 → 1 に動かす
   - O 側の雲が C 側へ接近し、Cl 側のつながりが弱くなる
2. `delta-density` に切り替える
   - 反応中心に gain / loss が分かれて見える
3. `homo-phase` / `lumo-phase` に切り替える
   - 正負の位相面が別色で出る
4. TS プリセットで `O–C` と `C–Cl` の overlap population を確認する
   - 両方が途中値になる
5. isovalue を動かしても、反応中心の位置関係が破綻しないことを確認する

## Why these tests matter

この作品は見た目が先に目に入るので、
少なくとも次の最低限は担保したいです。

- 基底の正規化が壊れていない
- 電子数保存が壊れていない
- 反応パスが意図通り
- 反応方向が overlap population に反映される
- 3D field の積分が常識的な範囲にある
