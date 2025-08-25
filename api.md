MediaWiki API 帮助
这是自动生成的MediaWiki API文档页面。

文档和例子：https://www.mediawiki.org/wiki/Special:MyLanguage/API:Main_page

主模块
来源：MediaWiki
许可协议：GPL-2.0-or-later
文档 礼仪和使用指引 常见问题 邮件列表 API宣告 程序错误与功能请求
状态：MediaWiki API已是成熟稳定的接口，且会得到积极的支持和改进。尽管我们尽力避免，但偶尔也需要作出重大更新；请订阅mediawiki-api-announce 邮件列表以便获得更新通知。

错误请求：当API收到错误请求时，HTTP header将会返回一个包含"MediaWiki-API-Error"的值，随后header的值与错误代码将会返回并设置为相同的值。详细信息请参阅API:错误与警告。

测试：要简化测试API请求的过程，请参见Special:ApiSandbox。

具体参数：
action
要执行的操作。

abusefiltercheckmatch
检查以查看滥用过滤器是否匹配某个变量集、某次编辑或某条日志记载的过滤器活动。
abusefilterchecksyntax
检查一个滥用过滤器的语法。
abusefilterevalexpression
对防滥用过滤器表达式求值。
abusefilterunblockautopromote
通过解除因滥用过滤器操作生效的自动提升剥夺来解封用户。
abuselogprivatedetails
显示AbuseLog项目的私有详情。
acquiretempusername
启用临时账号创建并且当前用户已退出时，获取临时用户的用户名并将其存储在当前会话中。如果名称已存储，则返回相同的名称。
antispoof
检查用户名是否触犯AntiSpoof的常规检查。
block
封禁一位用户。
centralauthtoken
取得centralauthtoken用于已认证的一个附加到wiki的请求。
centralnoticecdncacheupdatebanner
在请求的横幅及语言中，请求为匿名用户刷新在CDN（前端）存储的横幅缓存
centralnoticechoicedata
对于指定项目和语言，获取选择一个横幅需要的数据
centralnoticequerycampaign
获取一则通过的所有配置设置。
changeauthenticationdata
更改当前用户的身份验证数据。
changecontentmodel
变更页面的内容模型
checktoken
从action=query&meta=tokens检查令牌有效性。
clearhasmsg
清除当前用户的hasmsg标记。
clientlogin
使用交互式流登录wiki。
communityconfigurationedit
Change the content of a configuration provider in Community configuration
compare
获取两页面之间的差异。
createaccount
创建新用户账号。
createlocalaccount
强行创建本地账号。中央账号必须存在。
cxdelete
删除一个用翻译扩展创建的翻译草稿。
cxtoken
获取JWT令牌以通过cxserver的身份验证。
delete
删除一个页面。
deleteglobalaccount
删除一个全域用户。
discussiontoolsedit
在讨论页面上发布留言。
discussiontoolsfindcomment
按ID或名称查找留言。
discussiontoolsgetsubscriptions
获取给定话题的订阅状态。
discussiontoolssubscribe
订阅（或取消订阅）来接收有关话题的通知。
discussiontoolsthank
发送公开的感谢留言通知。
echocreateevent
手动触发给用户的通知
echomarkread
把当前用户的通知标记为已读。
echomarkseen
把当前用户的通知标记为已查看。
echomute
屏蔽或取消屏蔽来自特定用户或页面的通知。
edit
创建和编辑页面。
editmassmessagelist
编辑大量信息递送列表。
emailuser
电子邮件联系一位用户。
expandtemplates
展开wikitext中的所有模板。
featuredfeed
返回特色内容源。
feedcontributions
返回用户贡献纲要。
feedrecentchanges
返回最近更改的摘要。
feedwatchlist
返回监视列表纲要。
filerevert
回退一个文件至某一旧版本。
flow
允许对结构化讨论页面的操作。
flow-parsoid-utils
在wikitext和HTML之间互相转换文本。
flowthank
为一条Flow评论公开发送感谢通知。
globalblock
全域封禁或解封一位用户。
globalpreferenceoverrides
为当前用户的全域参数设置更改本地覆盖。
globalpreferences
更改当前用户的全域参数设置。
globaluserrights
将一位用户添加至全域用户组，或将其从组中移除。
growthmanagementorlist
管理在結構化導師清單中的資訊（通常存放在 MediaWiki:GrowthMentors.json 中）。此模組可被目前與往後的導師（新增他們自己或是變更他們的詳細資訊）以及管理員（適用於所有使用者）來使用。
growthmentordashboardupdatedata
安排导师面板中学员总览的特别更新。由于性能原因您每两个小时只能安排一次更新。
growthsetmenteestatus
設定學員的狀態（允許學員啟用/停用導師計畫模組或完全退出以刪除學員和導師的關係）
growthsetmentor
设置用户的导师。该变更将被公开记录。
growthstarmentee
由目前用户将学员标记或取消标记星号（私密存储且不记录）
help
显示指定模块的帮助。
homepagequestionstore
获取通过主页模块发布，并且已格式化的问题
imagerotate
此模块已禁用。
import
从其他wiki，或从XML文件导入页面。
jsonconfig
允许直接访问JsonConfig子系统。
languagesearch
使用任何字母搜索语言名称。
linkaccount
将来自第三方提供商的账号链接至当前用户。
login
登录并获取身份验证cookie。
logout
退出并清除会话数据。
managetags
执行有关更改标签的管理任务。
massmessage
发送一条信息到列出的多个页面。
mergehistory
合并页面历史。
move
移动一个页面。
opensearch
使用开放搜索协议搜索wiki。
options
更改当前用户的参数设置。
paraminfo
获得关于API模块的信息。
parse
解析内容并返回解析器输出。
patrol
巡查页面或修订版本。
protect
更改页面的保护等级。
purge
为指定标题刷新缓存。
query
取得来自并有关MediaWiki的数据。
removeauthenticationdata
从当前用户移除身份验证数据。
resetpassword
向用户发送密码重置邮件。
revisiondelete
删除和恢复修订版本。
rollback
撤销对页面的最近编辑。
rsd
导出一个RSD（Really Simple Discovery）架构。
setglobalaccountstatus
隐藏/锁定（以及解除隐藏/锁定）全域用户账号。
setnotificationtimestamp
更新监视页面的通知时间戳。
setpagelanguage
更改页面的语言。
shortenurl
把较长的URL缩短为短URL。
sitematrix
获取维基媒体网站列表。
spamblacklist
验证一个或多个URL是否属于垃圾链接阻止列表。
streamconfigs
公开事件流配置。仅返回format=json且formatversion=2。
strikevote
允许管理员作废或取消作废投票。
sxdelete
从数据库中删除草稿章节翻译及其平行语料。
tag
从个别修订或日志记录中添加或移除更改标签。
templatedata
获取由模板数据扩展存储的数据。
thank
向一名编辑者发送感谢通知。
titleblacklist
验证一个页面的标题、文件名或用户名是否触发标题黑名单。
torblock
检查某个 IP 地址是否作为 Tor 出口节点被阻止。
transcodereset
持有“transcode-reset”权限的用户可以重置并重启转码作业。
unblock
解封一位用户。
undelete
取消删除页面的修订版本。
unlinkaccount
从当前用户移除已链接的第三方账号。
upload
上传文件，或获取正在等待中的上传的状态。
userrights
更改一位用户的组成员。
validatepassword
验证密码是否符合wiki的密码方针。
watch
从当前用户的监视列表中添加或移除页面。
webapp-manifest
返回webapp证明。
webauthn
API模块，用于在注册/身份验证过程中在服务器和客户端之间进行通信。
wikilove
给另一用户维基有爱。
bouncehandler
内部的。​接收退回的电子邮件并处理它以处理失败的容器。
categorytree
内部的。​用于CategoryTree扩展的内部模块。
chartinfo
内部的。​Retrieve current count of how many unique Chart page usages there are. Multiple uses of the same chart on the same page are considered a single use.
cirrus-check-sanity
内部的。​搜尋索引中一段範圍頁面 ID 的正確性報告
cirrus-config-dump
内部的。​CirrusSearch配置的转储。
cirrus-mapping-dump
内部的。​用于此wiki的CirrusSearch映射转储。
cirrus-profiles-dump
内部的。​此Wiki上的CirrusSearch配置文件转储。
cirrus-settings-dump
内部的。​用于此wiki的CirrusSearch设置转储。
cspreport
内部的。​由浏览器使用以报告违反内容安全方针的内容。此模块应永不使用，除了在被CSP兼容的浏览器自动使用时。
cxcheckunreviewed
内部的。​對目前使用者檢查近期是否有發布任何快速、未經審閱的翻譯。
cxfavoritesuggestions
内部的。​Add or remove a favorite suggestion to the current user's list.
cxpublish
内部的。​保存用内容翻译扩展创建的页面。
cxpublishsection
内部的。​保存使用内容翻译扩展的章节翻译功能创建的章节。
cxsave
内部的。​此模块允许保存按章节的草稿翻译以节省带宽，并收集平行的语料库。
cxsplit
内部的。​為指定條目翻譯的各已翻譯章節，建立章節翻譯並儲存到資料庫
discussiontoolscompare
内部的。​获取两个页面修订间留言更改的有关信息。
discussiontoolspageinfo
内部的。​返回初始化讨论工具所需的元数据。
discussiontoolspreview
内部的。​预览讨论页面上的留言。
echopushsubscriptions
内部的。​管理当前用户的推送订阅。
editcheckreferenceurl
内部的。​Check the status of a URL for use as a reference.
fancycaptchareload
内部的。​获得一个新的FancyCaptcha。
growthinvalidateimagerecommendation
内部的。​作廢圖片推薦。
growthinvalidatepersonalizedpraisesuggestion
内部的。​讓導師面板上個性化表揚模組的值得表揚學員建議無效
helppanelquestionposter
内部的。​为当前用户处理通过帮助面板发布的问题。
jsondata
内部的。​取得本地化JSON数据。
jsontransform
内部的。​Retrieve JSON data transformed by a Lua function.
oathvalidate
内部的。​验证一个双因素验证（OATH）令牌。
parser-migration
内部的。​使用两种不同的解析器配置解析页面。
readinglists
内部的。​阅读列表写入操作。
sanitize-mapdata
内部的。​为Kartographer扩展执行数据验证
scribunto-console
内部的。​从Scribunto控制台提供XHR请求的内部模块。
securepollauth
内部的。​允许远程wiki在授予选举投票权限前对用户进行验证。
stashedit
内部的。​在分享缓存中准备编辑。
sxsave
内部的。​保存草稿章節翻譯，並存儲平行語料庫
timedtext
内部的。​提供被音轨元素所使用的字幕
ulslocalization
内部的。​获取指定语言的ULS本地化。
ulssetlang
内部的。​更新用户的首选界面语言。
visualeditor
内部的。​从Parsoid服务返回页面的HTML5。
visualeditoredit
内部的。​保存一个HTML5页面至MediaWiki（通过Parsoid服务转换为wikitext）。
wikimediaeventsblockededit
内部的。​有關禁止編輯嘗試的日誌資訊
以下值中的一个：abusefiltercheckmatch、​abusefilterchecksyntax、​abusefilterevalexpression、​abusefilterunblockautopromote、​abuselogprivatedetails、​acquiretempusername、​antispoof、​block、​centralauthtoken、​centralnoticecdncacheupdatebanner、​centralnoticechoicedata、​centralnoticequerycampaign、​changeauthenticationdata、​changecontentmodel、​checktoken、​clearhasmsg、​clientlogin、​communityconfigurationedit、​compare、​createaccount、​createlocalaccount、​cxdelete、​cxtoken、​delete、​deleteglobalaccount、​discussiontoolsedit、​discussiontoolsfindcomment、​discussiontoolsgetsubscriptions、​discussiontoolssubscribe、​discussiontoolsthank、​echocreateevent、​echomarkread、​echomarkseen、​echomute、​edit、​editmassmessagelist、​emailuser、​expandtemplates、​featuredfeed、​feedcontributions、​feedrecentchanges、​feedwatchlist、​filerevert、​flow-parsoid-utils、​flow、​flowthank、​globalblock、​globalpreferenceoverrides、​globalpreferences、​globaluserrights、​growthmanagementorlist、​growthmentordashboardupdatedata、​growthsetmenteestatus、​growthsetmentor、​growthstarmentee、​help、​homepagequestionstore、​imagerotate、​import、​jsonconfig、​languagesearch、​linkaccount、​login、​logout、​managetags、​massmessage、​mergehistory、​move、​opensearch、​options、​paraminfo、​parse、​patrol、​protect、​purge、​query、​removeauthenticationdata、​resetpassword、​revisiondelete、​rollback、​rsd、​setglobalaccountstatus、​setnotificationtimestamp、​setpagelanguage、​shortenurl、​sitematrix、​spamblacklist、​streamconfigs、​strikevote、​sxdelete、​tag、​templatedata、​thank、​titleblacklist、​torblock、​transcodereset、​unblock、​undelete、​unlinkaccount、​upload、​userrights、​validatepassword、​watch、​webapp-manifest、​webauthn、​wikilove、​bouncehandler、​categorytree、​chartinfo、​cirrus-check-sanity、​cirrus-config-dump、​cirrus-mapping-dump、​cirrus-profiles-dump、​cirrus-settings-dump、​cspreport、​cxcheckunreviewed、​cxfavoritesuggestions、​cxpublish、​cxpublishsection、​cxsave、​cxsplit、​discussiontoolscompare、​discussiontoolspageinfo、​discussiontoolspreview、​echopushsubscriptions、​editcheckreferenceurl、​fancycaptchareload、​growthinvalidateimagerecommendation、​growthinvalidatepersonalizedpraisesuggestion、​helppanelquestionposter、​jsondata、​jsontransform、​oathvalidate、​parser-migration、​readinglists、​sanitize-mapdata、​scribunto-console、​securepollauth、​stashedit、​sxsave、​timedtext、​ulslocalization、​ulssetlang、​visualeditor、​visualeditoredit、​wikimediaeventsblockededit
默认：help
format
输出的格式。

json
输出数据为JSON格式。
jsonfm
输出数据为JSON格式（使用HTML格式显示）。
none
不输出任何东西。
php
输出数据为序列化PHP格式。
phpfm
输出数据为序列化PHP格式（使用HTML格式显示）。
rawfm
输出数据为JSON格式，包含调试元素（使用HTML格式显示）。
xml
输出数据为XML格式。
xmlfm
输出数据为XML格式（使用HTML格式显示）。
以下值中的一个：json、​jsonfm、​none、​php、​phpfm、​rawfm、​xml、​xmlfm
默认：jsonfm
maxlag
最大延迟可被用于MediaWiki安装于数据库复制集中。要保存导致更多网站复制延迟的操作，此参数可使客户端等待直到复制延迟少于指定值时。万一发生过多延迟，错误代码maxlag会返回消息，例如等待$host中：延迟$lag秒。
参见手册:Maxlag参数以获取更多信息。

类型：整数
smaxage
设置s-maxage HTTP缓存控制头至这些秒。错误不会缓存。

类型：整数
值必须不少于0。
默认：0
maxage
设置max-age HTTP缓存控制头至这些秒。错误不会缓存。

类型：整数
值必须不少于0。
默认：0
assert
如果设置为user，则验证用户是否已登录（包括以临时用户身份登录）；如果设置为anon，则验证用户是否未登录；如果设置为bot，则验证用户是否拥有机器人用户权限。

以下值中的一个：anon、​bot、​user
assertuser
验证当前用户是命名用户。

类型：通过 用户名和​临时用户 中任意一种方式指定的用户
requestid
任何在此提供的值将包含在响应中。可以用以区别请求。

servedby
包含保存结果请求的主机名。

类型：布尔型 (详情)
curtimestamp
在结果中包括当前时间戳。

类型：布尔型 (详情)
responselanginfo
包含在结果中用于uselang和errorlang的语言。

类型：布尔型 (详情)
origin
使用跨域AJAX请求(CORS)访问API时，请将其设置为来源域。这必须包括在任何预检请求中，因此必须是请求URI（而不是POST正文）的一部分。

对于已验证的请求，这必须正确匹配Origin标头中的来源之一，因此必须将其设置为类似https://zh.wikipedia.org或https://meta.wikimedia.org的值。如果此参数与Origin标头不匹配，将返回403响应。如果此参数与Origin标头匹配并且来源被允许，则将设置Access-Control-Allow-Origin和Access-Control-Allow-Credentials标头。

对于未验证的请求，请指定值*。这将导致Access-Control-Allow-Origin标头被设置，但Access-Control-Allow-Credentials将为false，且所有用户特定数据将受限制。

crossorigin
使用跨域AJAX请求(CORS)访问API时，如果使用的是可以抵御跨站点请求伪造(CSRF)攻击的会话提供程序（例如OAuth），则请使用此参数而非origin=*以保持请求处于已通过身份验证的状态（即不是已退出未登录的状态）。此参数必须包含在任何预检请求中，因此必须是请求URI（而不是POST正文）的一部分。

请注意，大多数会话提供程序（包括标准的基于cookie的会话）不支持经过身份验证的CORS，因此不能使用此参数。

类型：布尔型 (详情)
uselang
用于消息翻译的语言。action=query&meta=siteinfo&siprop=languages可返回语言代码列表。您可以指定user以使用当前用户的语言设置，或指定content以使用此wiki的内容语言。

默认：user
variant
语言变体。仅当基础语言支持变体转换时起作用。

errorformat
用于警告和错误文本输出的格式

plaintext
包括HTML标签的wikitext被移除并且实体被替换。
wikitext
未解析的wikitext。
html
HTML
raw
消息的键和参数。
none
没有文本输出，仅有错误代码。
bc
MediaWiki 1.29之前使用的格式。errorlang和errorsuselocal会被忽略。
以下值中的一个：bc、​html、​none、​plaintext、​raw、​wikitext
默认：bc
errorlang
用于警告和错误的语言。action=query&meta=siteinfo&siprop=languages返回语言代码的列表。指定content以使用此wiki的内容语言，或指定uselang以使用与uselang参数相同的值。

默认：uselang
errorsuselocal
如果指定，错误文本将使用来自MediaWiki命名空间的本地自定义消息。

类型：布尔型 (详情)
centralauthtoken
当使用跨域名AJAX请求（CORS）访问API时，使用它以认证为当前的SUL用户。在进行CORS请求前，在此wiki使用action=centralauthtoken以检索令牌。每个令牌只可以使用一次，并在10秒后过期。这应包含在任何预先请求中，并因此应包含在请求URI中（而不是在POST正文中）。

例子：
主模块帮助。
api.php?action=help [在沙盒中打开]
一个页面中的所有帮助。
api.php?action=help&recursivesubmodules=1 [在沙盒中打开]
权限：
apihighlimits
在API查询中使用更高的上限（慢查询：500；快查询：5000）。慢查询的限制也适用于多值参数。
授予：bot和​sysop
数据类型
MediaWiki的输入应该是NFC规范化的UTF-8。MediaWiki可能会尝试转换其他输入，但这可能会导致某些操作（例如 编辑带有MD5检查）失败。

采用多个值的参数通常与使用管道字符分隔的值一起提交，例如param=value1|value2或param=value1%7Cvalue2。如果值必须包含竖线字符，请使用U+001F（单位分隔符）作为分隔符 并且 用U+001F作为该值的前缀，例如param=%1Fvalue1%1Fvalue2。

API请求中的一些参数类型需要进一步说明：

boolean
布尔参数的工作方式类似于HTML复选框：如果指定了参数，无论值如何，它都被认为是true。对于假值，完全省略参数。

expiry
到期时间。可以是相对时间（例如：5 months 或 2 weeks）或是绝对时间（例如：2014-09-18T12:34:56Z）。如果要无期限，请使用 infinite、indefinite、infinity、或 never。

timestamp
时间戳可以用多种格式指定，详情参见mediawiki.org上记录的时间戳库输入格式。建议使用ISO 8601日期和时间：2001-01-15T14: 56:00Z。此外，字符串now可用于指定当前时间戳。

模板参数
模板参数支持API模块需要为每个其他参数赋值的情况。例如如果有API模块请求水果，它会有参数水果指定请求的水果，以及模板参数{水果}-数量以指定每种水果请求多少。需要1个苹果、5个香蕉和20个草莓的API客户端可以做出类似水果=苹果|香蕉|草莓&苹果-数量=1&香蕉-数量=5&草莓-数量=20的请求。

制作人员
API 开发人员：

Yuri Astrakhan（创建者，2006年9月~2007年9月的开发组领导）
Roan Kattouw（2007年9月~2009年的开发组领导）
Victor Vasiliev
Bryan Tong Minh
Sam Reed
Brad Jorsch（2013年~2020年的开发组领导）
请将您的评论、建议和问题发送至mediawiki-api@lists.wikimedia.org，或提交错误请求至https://phabricator.wikimedia.org/。