export const reactionPreset = {
  id: 'sn2-hydroxide-bromomethane',
  title: 'SN2 Electron Cloud Simulator',
  summary:
    'HO⁻ + CH₃Br → CH₃OH + Br⁻ を題材に、孤立電子対・形成中の結合・脱離基側へ移る電子密度を 2D で可視化する。',
  equation: 'HO⁻ + CH₃Br → CH₃OH + Br⁻',
  assumptions: [
    '電子雲は Gaussian 風の楕円として描画し、実際の電子密度分布を定性的に近似している。',
    '反応は 1 本の反応座標で進むものとし、結合次数・原子位置・表示用電荷を連続補間している。',
    '立体化学は完全再現せず、backside attack と Walden inversion が見える範囲に絞っている。',
    '教育用の可視化であり、ab initio 計算や DFT の結果をそのまま表示するものではない。'
  ]
};
