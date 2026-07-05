# 心岛 v2.0 人格语义人工评审表

本表由脚本生成，只用于人工评审。脚本不会自动填写“人工通过”。

### 灯塔型

- 核心定义：你倾向在关系里成为稳定的照明点：愿意照顾、愿意修复，也愿意留下来把关系托住。
- baseline向量：`{"SC":55,"AU":35,"TR":70,"CL":70,"PA":60,"CM":78,"SI":50,"NV":30,"RM":65,"CS":94,"EC":72,"CR":90,"ER":62,"RI":82,"MN":50}`
- candidate-A向量：`{"SC":55,"AU":35,"TR":70,"CL":70,"PA":60,"CM":78,"SI":50,"NV":30,"RM":65,"CS":97,"EC":72,"CR":90,"ER":59,"RI":85,"MN":50}`
- candidate-B向量：`{"SC":55,"AU":35,"TR":70,"CL":70,"PA":60,"CM":78,"SI":50,"NV":30,"RM":65,"CS":97,"EC":72,"CR":90,"ER":59,"RI":85,"MN":50}`
- candidate-B构念变化：`{"SC":0,"AU":0,"TR":0,"CL":0,"PA":0,"CM":0,"SI":0,"NV":0,"RM":0,"CS":0,"EC":0,"CR":0,"ER":0,"RI":0,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：筑巢型 (0.001)
- 当前Top1占比(candidate-A uniform)：2.79%
- candidate-E Top1占比(uniform)：4.23%
- 主要命中作答模式：无明显高频模式
- 语义异常提示：常规人工复核。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 守门人

- 核心定义：你会认真决定谁能进入你的关系世界：不是冷淡，而是需要确认节奏、承诺和可信度。
- baseline向量：`{"SC":45,"AU":88,"TR":72,"CL":48,"PA":30,"CM":82,"SI":50,"NV":28,"RM":68,"CS":45,"EC":38,"CR":62,"ER":68,"RI":70,"MN":42}`
- candidate-A向量：`{"SC":45,"AU":88,"TR":72,"CL":48,"PA":30,"CM":82,"SI":50,"NV":28,"RM":68,"CS":45,"EC":38,"CR":62,"ER":68,"RI":70,"MN":42}`
- candidate-B向量：`{"SC":45,"AU":88,"TR":72,"CL":48,"PA":30,"CM":82,"SI":50,"NV":28,"RM":68,"CS":45,"EC":38,"CR":62,"ER":68,"RI":70,"MN":42}`
- candidate-B构念变化：`{"SC":0,"AU":0,"TR":0,"CL":0,"PA":0,"CM":0,"SI":0,"NV":0,"RM":0,"CS":0,"EC":0,"CR":0,"ER":0,"RI":0,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：观星者 (0.001)
- 当前Top1占比(candidate-A uniform)：14.73%
- candidate-E Top1占比(uniform)：12.71%
- 主要命中作答模式：uniform、middle、extreme、conservative
- 语义异常提示：常规人工复核。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 筑巢型

- 核心定义：你倾向把爱落实成共同生活：亲密、经营和留下，是你判断关系是否真实的重要依据。
- baseline向量：`{"SC":70,"AU":28,"TR":78,"CL":90,"PA":58,"CM":94,"SI":50,"NV":22,"RM":78,"CS":68,"EC":62,"CR":76,"ER":64,"RI":88,"MN":56}`
- candidate-A向量：`{"SC":70,"AU":28,"TR":74,"CL":90,"PA":58,"CM":98,"SI":50,"NV":22,"RM":81,"CS":68,"EC":62,"CR":76,"ER":64,"RI":88,"MN":56}`
- candidate-B向量：`{"SC":70,"AU":31,"TR":72.5,"CL":87,"PA":58,"CM":93.5,"SI":50,"NV":25,"RM":82.5,"CS":70.25,"EC":62,"CR":76,"ER":64,"RI":85,"MN":56}`
- candidate-B构念变化：`{"SC":0,"AU":3,"TR":-1.5,"CL":-3,"PA":0,"CM":-4.5,"SI":0,"NV":3,"RM":1.5,"CS":2.25,"EC":0,"CR":0,"ER":0,"RI":-3,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：港湾型 (0.002)
- 当前Top1占比(candidate-A uniform)：0.26%
- candidate-E Top1占比(uniform)：0.60%
- 主要命中作答模式：无明显高频模式
- 语义异常提示：重点审查是否仍代表稳定建设、安全感与长期投入。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 收藏家

- 核心定义：你会把关系里的细节和记忆保存得很深：过去的意义、情绪痕迹和精神联结会持续影响你。
- baseline向量：`{"SC":62,"AU":58,"TR":55,"CL":62,"PA":30,"CM":55,"SI":80,"NV":24,"RM":45,"CS":42,"EC":35,"CR":45,"ER":72,"RI":56,"MN":95}`
- candidate-A向量：`{"SC":62,"AU":58,"TR":55,"CL":62,"PA":30,"CM":55,"SI":80,"NV":24,"RM":45,"CS":42,"EC":35,"CR":45,"ER":72,"RI":56,"MN":95}`
- candidate-B向量：`{"SC":62,"AU":58,"TR":55,"CL":62,"PA":30,"CM":55,"SI":80,"NV":24,"RM":45,"CS":42,"EC":35,"CR":45,"ER":72,"RI":56,"MN":95}`
- candidate-B构念变化：`{"SC":0,"AU":0,"TR":0,"CL":0,"PA":0,"CM":0,"SI":0,"NV":0,"RM":0,"CS":0,"EC":0,"CR":0,"ER":0,"RI":0,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：观星者 (0.001)
- 当前Top1占比(candidate-A uniform)：13.57%
- candidate-E Top1占比(uniform)：11.93%
- 主要命中作答模式：uniform、middle、extreme、lowAgreement、conservative、constructConsistent、constructConflict
- 语义异常提示：常规人工复核。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 候鸟型

- 核心定义：你需要亲密，也需要呼吸感：关系要能靠近，也要允许你保有移动和自我节奏。
- baseline向量：`{"SC":55,"AU":86,"TR":48,"CL":68,"PA":62,"CM":30,"SI":68,"NV":84,"RM":38,"CS":35,"EC":58,"CR":42,"ER":65,"RI":35,"MN":55}`
- candidate-A向量：`{"SC":55,"AU":86,"TR":48,"CL":68,"PA":62,"CM":30,"SI":68,"NV":84,"RM":38,"CS":35,"EC":58,"CR":42,"ER":65,"RI":35,"MN":55}`
- candidate-B向量：`{"SC":55,"AU":89,"TR":45.75,"CL":63.5,"PA":62,"CM":27,"SI":68,"NV":88.5,"RM":38,"CS":32.75,"EC":58,"CR":42,"ER":65,"RI":31.25,"MN":52}`
- candidate-B构念变化：`{"SC":0,"AU":3,"TR":-2.25,"CL":-4.5,"PA":0,"CM":-3,"SI":0,"NV":4.5,"RM":0,"CS":-2.25,"EC":0,"CR":0,"ER":0,"RI":-3.75,"MN":-3}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：流浪诗人 (0.003)
- 当前Top1占比(candidate-A uniform)：18.92%
- candidate-E Top1占比(uniform)：16.11%
- 主要命中作答模式：uniform、middle、extreme、conservative、constructConsistent、constructConflict
- 语义异常提示：重点审查是否仍代表迁移、自由与关系流动，而不是中间答案兜底类型。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 岛屿型

- 核心定义：你在关系里保有很强的自我完整性：可以爱人，但不喜欢把自我交给关系决定。
- baseline向量：`{"SC":28,"AU":94,"TR":62,"CL":25,"PA":24,"CM":45,"SI":35,"NV":38,"RM":62,"CS":22,"EC":28,"CR":48,"ER":78,"RI":32,"MN":25}`
- candidate-A向量：`{"SC":28,"AU":94,"TR":62,"CL":25,"PA":24,"CM":45,"SI":35,"NV":38,"RM":62,"CS":22,"EC":28,"CR":48,"ER":78,"RI":32,"MN":25}`
- candidate-B向量：`{"SC":31,"AU":90.25,"TR":62,"CL":28,"PA":24,"CM":45,"SI":35,"NV":38,"RM":62,"CS":25,"EC":31,"CR":48,"ER":78,"RI":32,"MN":25}`
- candidate-B构念变化：`{"SC":3,"AU":-3.75,"TR":0,"CL":3,"PA":0,"CM":0,"SI":0,"NV":0,"RM":0,"CS":3,"EC":3,"CR":0,"ER":0,"RI":0,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：候鸟型 (0.002)
- 当前Top1占比(candidate-A uniform)：6.11%
- candidate-E Top1占比(uniform)：6.35%
- 主要命中作答模式：extreme、lowAgreement、constructConsistent
- 语义异常提示：重点审查是否被低同意答案错误吸收。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 探险家

- 核心定义：你容易被新的关系可能点亮：探索、主动和变化，是你理解亲密的重要入口。
- baseline向量：`{"SC":38,"AU":78,"TR":45,"CL":55,"PA":78,"CM":24,"SI":62,"NV":95,"RM":35,"CS":30,"EC":68,"CR":50,"ER":58,"RI":28,"MN":30}`
- candidate-A向量：`{"SC":38,"AU":78,"TR":45,"CL":55,"PA":78,"CM":24,"SI":62,"NV":95,"RM":35,"CS":30,"EC":68,"CR":50,"ER":58,"RI":28,"MN":30}`
- candidate-B向量：`{"SC":38,"AU":78,"TR":45,"CL":55,"PA":78,"CM":24,"SI":62,"NV":95,"RM":35,"CS":30,"EC":68,"CR":50,"ER":58,"RI":28,"MN":30}`
- candidate-B构念变化：`{"SC":0,"AU":0,"TR":0,"CL":0,"PA":0,"CM":0,"SI":0,"NV":0,"RM":0,"CS":0,"EC":0,"CR":0,"ER":0,"RI":0,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：星火型 (0.001)
- 当前Top1占比(candidate-A uniform)：4.98%
- candidate-E Top1占比(uniform)：5.17%
- 主要命中作答模式：无明显高频模式
- 语义异常提示：常规人工复核。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 流浪诗人

- 核心定义：你会被关系中的精神远方、意义感和记忆牵引：爱对你不只是稳定，也是一种内在旅程。
- baseline向量：`{"SC":48,"AU":70,"TR":48,"CL":62,"PA":65,"CM":30,"SI":96,"NV":75,"RM":25,"CS":38,"EC":62,"CR":48,"ER":68,"RI":42,"MN":72}`
- candidate-A向量：`{"SC":48,"AU":70,"TR":48,"CL":62,"PA":65,"CM":30,"SI":96,"NV":75,"RM":25,"CS":38,"EC":62,"CR":48,"ER":68,"RI":42,"MN":72}`
- candidate-B向量：`{"SC":48,"AU":70,"TR":48,"CL":62,"PA":65,"CM":30,"SI":96,"NV":75,"RM":25,"CS":38,"EC":62,"CR":48,"ER":68,"RI":42,"MN":72}`
- candidate-B构念变化：`{"SC":0,"AU":0,"TR":0,"CL":0,"PA":0,"CM":0,"SI":0,"NV":0,"RM":0,"CS":0,"EC":0,"CR":0,"ER":0,"RI":0,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：候鸟型 (0.004)
- 当前Top1占比(candidate-A uniform)：5.57%
- candidate-E Top1占比(uniform)：6.04%
- 主要命中作答模式：无明显高频模式
- 语义异常提示：常规人工复核。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 星火型

- 核心定义：你在关系里有点燃能力：喜欢直接表达、主动靠近，也容易被强烈的吸引感推动。
- baseline向量：`{"SC":60,"AU":40,"TR":50,"CL":78,"PA":94,"CM":35,"SI":70,"NV":78,"RM":35,"CS":42,"EC":88,"CR":45,"ER":60,"RI":38,"MN":30}`
- candidate-A向量：`{"SC":60,"AU":40,"TR":50,"CL":78,"PA":94,"CM":35,"SI":70,"NV":78,"RM":35,"CS":42,"EC":88,"CR":45,"ER":60,"RI":38,"MN":30}`
- candidate-B向量：`{"SC":60,"AU":40,"TR":50,"CL":78,"PA":94,"CM":35,"SI":70,"NV":78,"RM":35,"CS":42,"EC":88,"CR":45,"ER":60,"RI":38,"MN":30}`
- candidate-B构念变化：`{"SC":0,"AU":0,"TR":0,"CL":0,"PA":0,"CM":0,"SI":0,"NV":0,"RM":0,"CS":0,"EC":0,"CR":0,"ER":0,"RI":0,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：探险家 (0.003)
- 当前Top1占比(candidate-A uniform)：6.60%
- candidate-E Top1占比(uniform)：6.87%
- 主要命中作答模式：constructConsistent
- 语义异常提示：常规人工复核。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 月光型

- 核心定义：你擅长温柔地看见别人：亲密、照顾和精神理解，是你关系里的主要光源。
- baseline向量：`{"SC":68,"AU":38,"TR":72,"CL":82,"PA":58,"CM":70,"SI":78,"NV":35,"RM":58,"CS":76,"EC":68,"CR":68,"ER":76,"RI":70,"MN":55}`
- candidate-A向量：`{"SC":68,"AU":38,"TR":69,"CL":82,"PA":58,"CM":70,"SI":82,"NV":35,"RM":58,"CS":79,"EC":68,"CR":68,"ER":76,"RI":68,"MN":55}`
- candidate-B向量：`{"SC":68,"AU":38,"TR":67.5,"CL":79,"PA":58,"CM":68.5,"SI":84.25,"NV":35,"RM":58,"CS":76,"EC":68,"CR":68,"ER":76,"RI":68,"MN":55}`
- candidate-B构念变化：`{"SC":0,"AU":0,"TR":-1.5,"CL":-3,"PA":0,"CM":-1.5,"SI":2.25,"NV":0,"RM":0,"CS":-3,"EC":0,"CR":0,"ER":0,"RI":0,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：灯塔型 (0.002)
- 当前Top1占比(candidate-A uniform)：3.98%
- candidate-E Top1占比(uniform)：5.59%
- 主要命中作答模式：middle、highAgreement、conservative
- 语义异常提示：重点审查是否被高同意答案错误吸收。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 镜像型

- 核心定义：你对关系里的情绪变化非常敏感：容易感受到对方，也需要确认自己没有被情绪淹没。
- baseline向量：`{"SC":82,"AU":30,"TR":42,"CL":75,"PA":50,"CM":58,"SI":62,"NV":25,"RM":42,"CS":72,"EC":58,"CR":55,"ER":92,"RI":62,"MN":58}`
- candidate-A向量：`{"SC":82,"AU":30,"TR":42,"CL":75,"PA":50,"CM":58,"SI":62,"NV":25,"RM":42,"CS":72,"EC":58,"CR":55,"ER":92,"RI":62,"MN":58}`
- candidate-B向量：`{"SC":82,"AU":30,"TR":42,"CL":75,"PA":50,"CM":58,"SI":62,"NV":25,"RM":42,"CS":72,"EC":58,"CR":55,"ER":92,"RI":62,"MN":58}`
- candidate-B构念变化：`{"SC":0,"AU":0,"TR":0,"CL":0,"PA":0,"CM":0,"SI":0,"NV":0,"RM":0,"CS":0,"EC":0,"CR":0,"ER":0,"RI":0,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：摆渡人 (0.002)
- 当前Top1占比(candidate-A uniform)：11.41%
- candidate-E Top1占比(uniform)：9.89%
- 主要命中作答模式：uniform、middle、extreme、conservative
- 语义异常提示：常规人工复核。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 观星者

- 核心定义：你会把爱放进更长远的图景：理想、承诺和现实可行性需要同时成立。
- baseline向量：`{"SC":42,"AU":68,"TR":78,"CL":55,"PA":35,"CM":84,"SI":94,"NV":32,"RM":82,"CS":45,"EC":52,"CR":62,"ER":60,"RI":72,"MN":40}`
- candidate-A向量：`{"SC":42,"AU":68,"TR":78,"CL":55,"PA":35,"CM":84,"SI":94,"NV":32,"RM":82,"CS":45,"EC":52,"CR":62,"ER":60,"RI":72,"MN":40}`
- candidate-B向量：`{"SC":42,"AU":66.5,"TR":78,"CL":55,"PA":35,"CM":81,"SI":90.25,"NV":33.5,"RM":79,"CS":45,"EC":52,"CR":62,"ER":60,"RI":72,"MN":40}`
- candidate-B构念变化：`{"SC":0,"AU":-1.5,"TR":0,"CL":0,"PA":0,"CM":-3,"SI":-3.75,"NV":1.5,"RM":-3,"CS":0,"EC":0,"CR":0,"ER":0,"RI":0,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：守门人 (0.005)
- 当前Top1占比(candidate-A uniform)：4.18%
- candidate-E Top1占比(uniform)：5.05%
- 主要命中作答模式：volatile
- 语义异常提示：重点审查是否被高波动答案错误吸收。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 同行者

- 核心定义：你重视两个人是否真的走在同一条路上：现实匹配、共同计划和可信协作很重要。
- baseline向量：`{"SC":55,"AU":58,"TR":84,"CL":60,"PA":32,"CM":88,"SI":48,"NV":25,"RM":96,"CS":55,"EC":60,"CR":70,"ER":66,"RI":78,"MN":35}`
- candidate-A向量：`{"SC":55,"AU":58,"TR":84,"CL":60,"PA":32,"CM":88,"SI":48,"NV":25,"RM":96,"CS":55,"EC":60,"CR":70,"ER":66,"RI":78,"MN":35}`
- candidate-B向量：`{"SC":55,"AU":58,"TR":84,"CL":60,"PA":32,"CM":88,"SI":48,"NV":25,"RM":96,"CS":55,"EC":60,"CR":70,"ER":66,"RI":78,"MN":35}`
- candidate-B构念变化：`{"SC":0,"AU":0,"TR":0,"CL":0,"PA":0,"CM":0,"SI":0,"NV":0,"RM":0,"CS":0,"EC":0,"CR":0,"ER":0,"RI":0,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：守门人 (0.002)
- 当前Top1占比(candidate-A uniform)：1.92%
- candidate-E Top1占比(uniform)：2.41%
- 主要命中作答模式：无明显高频模式
- 语义异常提示：常规人工复核。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 港湾型

- 核心定义：你需要一段能让人安心停靠的关系：信任、亲密和留下，是你最看重的稳定感。
- baseline向量：`{"SC":78,"AU":42,"TR":94,"CL":82,"PA":45,"CM":78,"SI":52,"NV":25,"RM":65,"CS":70,"EC":62,"CR":78,"ER":72,"RI":82,"MN":48}`
- candidate-A向量：`{"SC":78,"AU":42,"TR":98,"CL":82,"PA":45,"CM":74,"SI":52,"NV":25,"RM":65,"CS":73,"EC":62,"CR":78,"ER":72,"RI":82,"MN":48}`
- candidate-B向量：`{"SC":75,"AU":45,"TR":93.5,"CL":79,"PA":45,"CM":74,"SI":52,"NV":27.25,"RM":65,"CS":74.5,"EC":62,"CR":76.5,"ER":72,"RI":79,"MN":48}`
- candidate-B构念变化：`{"SC":-3,"AU":3,"TR":-4.5,"CL":-3,"PA":0,"CM":0,"SI":0,"NV":2.25,"RM":0,"CS":1.5,"EC":0,"CR":-1.5,"ER":0,"RI":-3,"MN":0}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：镜像型 (0.002)
- 当前Top1占比(candidate-A uniform)：0.58%
- candidate-E Top1占比(uniform)：1.07%
- 主要命中作答模式：无明显高频模式
- 语义异常提示：重点审查是否与筑巢型、月光型过近。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：

### 摆渡人

- 核心定义：你擅长把关系带过情绪河流：看见波动、表达重点，并推动冲突走向修复。
- baseline向量：`{"SC":76,"AU":48,"TR":45,"CL":72,"PA":62,"CM":50,"SI":65,"NV":45,"RM":42,"CS":58,"EC":82,"CR":86,"ER":88,"RI":55,"MN":68}`
- candidate-A向量：`{"SC":76,"AU":48,"TR":41,"CL":72,"PA":62,"CM":50,"SI":65,"NV":45,"RM":42,"CS":58,"EC":86,"CR":86,"ER":91,"RI":51,"MN":68}`
- candidate-B向量：`{"SC":76,"AU":48,"TR":39.5,"CL":72,"PA":62,"CM":50,"SI":65,"NV":45,"RM":42,"CS":58,"EC":88.25,"CR":87.5,"ER":92.5,"RI":51.75,"MN":69.5}`
- candidate-B构念变化：`{"SC":0,"AU":0,"TR":-1.5,"CL":0,"PA":0,"CM":0,"SI":0,"NV":0,"RM":0,"CS":0,"EC":2.25,"CR":1.5,"ER":1.5,"RI":0.75,"MN":1.5}`
- candidate-D解释变化：candidate-D does not change vectors; it changes distance interpretation to fixed standardized absolute + shape hybrid.
- candidate-E解释变化：candidate-E does not change vectors; it changes distance interpretation with answer-style adaptive alpha.
- 最常混淆人格：镜像型 (0.003)
- 当前Top1占比(candidate-A uniform)：4.41%
- candidate-E Top1占比(uniform)：5.99%
- 主要命中作答模式：highAgreement
- 语义异常提示：常规人工复核。
- 人工评审栏：接受 / 需要修改 / 不接受：__________
- 备注：
