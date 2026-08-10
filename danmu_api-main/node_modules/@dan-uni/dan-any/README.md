# @dan-uni/dan-any

`@dan-uni/dan-any` (v2) 是一个弹幕转换与处理库，用于在不同平台格式之间导入、导出与统一处理弹幕数据。

它的核心思路是：

- 用 `Adapter` 把外部格式导入为统一数据
- 用 `Transformer` 把统一数据导出为目标格式
- 用 `Plugin` 在处理中间态（`UniChunk`）上做增强/清洗/统计

v2 使用 drizzle+pglite(支持`MemoryFS`(默认)/`NodeFS`/`IndexedDbFS`/`OpfsAhpFS`) 作为默认数据库选项(`@dan-uni/dan-any/core/main/drizzle`)，同时允许通过drizzle接入自定义postgres数据库实例  
v2 打包大小gzip后约100KB (大部分为打包后展开的drizzle schema定义)，同时支持tree-shake，故不会大幅增加软件体积  
v2 在第一次初始化实例时可能有约1s的开销，建议使用 [PGLite的Multi-tab Worker](https://pglite.dev/docs/multi-tab-worker) 使所有调用共享一个数据库实例

v2 同时提供了纯TS实现的方法（`@dan-uni/dan-any/core/main/pure`），不依赖drizzle+pglite，使用Map进行数据管理。

由于pglite(调用了Emscripten生成的wasm胶水代码)在 `@edge-runtime/vm` `ServiceWorker` 下无法正常检测环境(process、pathname等无法检测)，因此在这些环境下应当使用纯TS实现的方法。

## 功能概览

### Formats 支持转换的格式

`pb`指`protobuf`格式(grpc协议下的默认传输格式)

- [x] DanUni(json,pb): `DanuniJsonAdapter` `DanuniJsonTransformerConfigurator` `DanuniPbAdapter` `DanuniPbTransformer`
- [x] bili(普通+高级弹幕,xml) `双向`: `BiliXmlAdapter` `BiliXmlTransformerConfigurator`
- [x] bili(普通+高级弹幕,pb) `正向`: `BiliGrpcAdapter`
- [x] bili(指令弹幕,pb) `正向`: `BiliCommandGrpcAdapter`
- [x] dplayer: `DplayerAdapter` `DplayerTransformer`
- [x] artplayer: `ArtplayerAdapter` `ArtplayerTransformer`
- [x] 弹弹Play: `DdplayAdapter` `DdplayTransformer`
- [x] tencent `正向`: `TencentAdapter`
- [x] vod `双向`: `VodAdapter` `VodTransformer`
- [x] baha `双向`: `BahaAdapter` `BahaTransformer`
- [x] iqiyi `正向`: `IqiyiAdapter`
- [x] youku `正向`: `YoukuAdapter`
- [x] mgtv `正向`: `MgtvAdapter`
- [x] [ASS(`@dan-uni/dan-any-ext-ass`)](https://github.com/ani-uni/dan-any-ext-ass) `双向(部分支持，仅该库生成的ass文件支持还原)`

### Plugins 常用插件

- `MergePluginConfigurator`（合并重复弹幕）
- `DetaoluPluginConfigurator` (基于pakku.js的弹幕过滤器): 由 [@dan-uni/dan-any-plugin-detaolu](https://github.com/ani-uni/dan-any-plugin-detaolu) 提供
- `DowngradeAdvancedPluginConfigurator`（高级弹幕降级）
- `GetStatsTransformerConfigurator`（统计输出）
- `HeatmapTransformerConfigurator`（热力图生成）

## 安装

```bash
vp add @dan-uni/dan-any
bun add @dan-uni/dan-any
pnpm add @dan-uni/dan-any
```

## 接入 SKILL

可以从 `/.agents/skills/dan-any/SKILL.md` 导入技能文件。

## 快速开始

详细使用方法可以参考库中的测试文件。

### 1) 从 Bilibili XML 导入，再导出为 Danuni JSON

```ts
import { UniDB } from "@dan-uni/dan-any/core/main/drizzle";
// import { UniDB } from '@dan-uni/dan-any/core/main/pure'
import { BiliXmlAdapter, DanuniJsonTransformerConfigurator } from "@dan-uni/dan-any/adapters";

const xml = `...bili xml弹幕文本...`;

const udb = await new UniDB().init();
const chunk = await udb.import(BiliXmlAdapter(xml));
const json = await chunk.export(DanuniJsonTransformerConfigurator({ minify: true }));

console.log(json);
await udb.close();
```

### 2) 在处理链中使用插件

```ts
import { mergePluginConfigurator } from "@dan-uni/dan-any/plugins";
import { DanuniJsonTransformerConfigurator } from "@dan-uni/dan-any/adapters";

const merged = await chunk.plugin(mergePluginConfigurator(10));
const result = await merged.export(DanuniJsonTransformerConfigurator({ minify: true }));

console.log(result);
```

### 3) PB 双向示例（导出再导入）

```ts
import { DanuniPbTransformer, DanuniPbAdapter } from "@dan-uni/dan-any/adapters";

const pb = await chunk.export(DanuniPbTransformer);
const reimported = await udb.import(DanuniPbAdapter(pb));
```

### 高级: 提供兼容的drizzle+pglite实例接入自己的数据库

详见 测试文件 `tests/db.test.ts` 。

### 高级: 使用 `WildcardAdapterUtil` 进行格式自动识别与导入

详见 测试文件 `tests/utils.test.ts` 。

### 高级: 自行实现 UniDB、InitedUniDB、UniChunk 方法

```ts
import * as base from "./index.ts";

class UniDB implements base.UniDB {
  // 实现 UniDB 接口
}
class InitedUniDB extends UniDB implements base.InitedUniDB {
  // 实现 InitedUniDB 接口
}
class UniChunk implements base.UniChunk {
  // 实现 UniChunk 接口
}
```

注意实现 `import`/`plugin` 方法时需要类型转换 `base.UniDB` / `base.InitedUniDB` / `base.UniChunk` 为当前实现的类，以保证插件系统的类型兼容性。

详见 `src/core/main-pure.ts` / `src/core/main-drizzle.ts` 。

## 模块入口

包已提供以下子路径导出：

- `@dan-uni/dan-any`（聚合导出）
- `@dan-uni/dan-any/adapters` (导入、导出适配器)
- `@dan-uni/dan-any/core` (核心类与接口定义+聚合导出core实现)
  - `@dan-uni/dan-any/core/main/drizzle` (drizzle+pglite核心实现)
  - `@dan-uni/dan-any/core/main/pure` (纯TS核心实现)
- `@dan-uni/dan-any/plugins` (插件、类插件导出、类导出插件)
- `@dan-uni/dan-any/utils` (工具函数)
- `@dan-uni/dan-any/core/db/schema` (drizzle+pglite 数据库schema定义)
- `@dan-uni/dan-any/core/db/utils` (drizzle+pglite 数据库工具函数)

## 开发

```bash
vp install
vp check
vp test
vp pack
```

## 许可

`LGPL-3.0-or-later`
