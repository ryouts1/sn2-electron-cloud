# Interview Notes

## 一言でいうと

複数の methyl SN2 reaction preset に対して、反応に直接関与する電子雲だけを切り出して 3D の probability cloud として比較表示するブラウザアプリです。

## 見せたい強み

- 固定デモを reaction family viewer に拡張した設計力
- ドメイン知識を UI の切り替え体験に落とした力
- heavy element を含む minimal basis と電子数集計の整理
- reaction-dependent なラベルや距離指標まで含めて UI を整えたこと
- テストで幾何・電子数・projector の整合を押さえていること

## 面接で説明しやすいポイント

### なぜ多反応モードにしたか

`OH⁻ + CH₃Cl` だけだと単発デモに見えやすい。reaction preset library にすると、reactive-only 表示系が単なるハードコードではなく、**同型反応へ再利用できる設計** だと伝えやすい。

### なぜ自由入力ではなく preset なのか

就活用では、まず比較しやすい reaction family を安定して動かすほうが筋が良い。自由入力より先に、reaction-dependent な幾何・電子数・UI を崩さず切り替えられることを優先した。

### なぜ extended Hückel のままなのか

今回の主眼は、確率雲の意味づけと reaction family 比較の設計にある。ここで無理に外部量子化学エンジンまで抱えるより、何が近似で何が表示上の工夫かを明確にしたほうが説明しやすい。
