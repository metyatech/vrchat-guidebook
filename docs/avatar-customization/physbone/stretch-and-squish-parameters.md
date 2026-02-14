# Stretch & Squish パラメータ早見表

`VRC Phys Bone` の `Stretch & Squish` で、伸び方の調整時によく触る項目をまとめます。

## 主要パラメータ

## `Stretch Motion`

- 役割: ボーンの伸縮/変形をどれだけ有効にするかを決める
- 上げると: 伸び変形が出やすくなる
- 下げると: 伸び変形が抑えられる

## `Max Stretch`

- 役割: 伸びる最大量
- 単位感: 元ボーン長を `1.0` とした倍率
- 注意: 値を大きくしすぎると、意図しない極端な伸びが出やすい

## `Max Squish`

- 役割: 縮む最大量
- 注意: 値を上げると、押し込まれたときの詰まり感が強くなる

## 調整の進め方

1. `Max Stretch` / `Max Squish` を小さめから開始
2. `Stretch Motion` で効き具合を合わせる
3. Play Mode で引っ張り確認しながら微調整

実際の確認手順は以下を参照してください。  
[Play Mode での伸び確認手順](/avatar-customization/physbone/playmode-stretch-test)
