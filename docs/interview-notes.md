# Interview Notes

## この作品を一言でいうと

`OH⁻ + CH₃Cl → CH₃OH + Cl⁻` を題材に、近似電子状態から **反応に直接関与する donor / acceptor / density-flow だけ** を切り出して、3D の probability cloud として表示する計算可視化ツールです。

## 以前の版から何を直したか

前の版は HOMO / LUMO や全密度もそのまま出していたので、「反応に関係する電子雲だけ見たい」という要求に対してはまだ広すぎました。

そこで今回は、

- O / C / Cl の反応軸 x 方向に重みを置く projector を追加
- occupied donor と virtual acceptor を選び直す selector を追加
- reactive channel density / reactive flow を別計算にした
- UI から spectator density の view を外した

という形に整理しました。

## 何が技術的な見どころか

- 非直交基底の overlap / orthogonalization / density matrix まで実装していること
- full electronic model と reactive display model を分離していること
- worker で field を作り、main thread では stochastic resampling に専念させていること
- 「反応に関与する電子雲」の定義を projector と energy window で説明できること
- UI が見せたい化学に合わせて削られていること

## 面接で聞かれそうな点

### これは厳密計算か

いいえ。電子状態は extended Hückel + 最小基底 Gaussian です。さらに reactive-only の表示は AO projector による近似分解です。

### donor / acceptor はどう定義しているか

SN2 の反応軸に沿う O / C / Cl の x 方向 σ チャネルに重みを置き、occupied 側は HOMO 近傍、virtual 側は LUMO 近傍で projector 成分が大きい軌道を選んでいます。

### 色は何を表しているか

donor / acceptor cloud では signed `ψ` の gradient です。real-valued orbital として扱っているので、complex phase 全体ではなく正負の sign を表しています。

### なぜ点群にしたか

「電子が見つかりやすい場所ほど点が密になる」表示のほうが、動画で見たい probability cloud の意味と揃うからです。

### 何を今後伸ばすか

研究寄りにするなら cube file 読み込み、理論寄りにするなら local diabatization や projector 定義の比較、教材寄りにするなら point inspection や slice plane を追加するのが自然です。
