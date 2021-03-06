var cityDataset = [
    {
        "name": "北京市",
        "next": [{ "name": "市辖区" }, { "name": "东城区" }, { "name": "西城区" }, { "name": "朝阳区" }, { "name": "丰台区" }, { "name": "石景山区" },
            { "name": "海淀区" }, { "name": "门头沟区" }, { "name": "房山区" }, { "name": "通州区" }, { "name": "顺义区" }, { "name": "怀柔区" }]
    },
    {
        "name": "河北省",
        "next": [{ "name": "晋州市" }, { "name": "石家庄市" }, { "name": "遵化市" }, { "name": "迁安市" }, { "name": "秦皇岛市" }, { "name": "邯郸市" },
        { "name": "武安市" }, { "name": "邢台市" }, { "name": "唐山市" }, { "name": "南宫市" }]
    },
    {
        "name": "辽宁省",
        "next": [{ "name": "沈阳市" }, { "name": "大连市" }, { "name": "瓦房店市" }, { "name": "庄河市" }, { "name": "鞍山市" }, { "name": "海城市" },
        { "name": "抚顺市" }, { "name": "本溪市" }, { "name": "南芬市" }, { "name": "丹东市" }, { "name": "东港市" }, { "name": "凤城市" }]
    },
    {
        "name": "浙江省",
        "next": [{ "name": "杭州市" }, { "name": "临安市" }, { "name": "宁波市" }, { "name": "余姚市" }, { "name": "慈溪市" }, { "name": "奉化市" },
            { "name": "温州市" }, { "name": "嘉兴市" }, { "name": "诸暨市" }, { "name": "金华市" }, { "name": "舟山市" }, { "name": "海宁市" }]
    },
    {
        "name": "江西省",
        "next": [{ "name": "南昌市" }, { "name": "景德镇市" }, { "name": "乐平市" }, { "name": "萍乡市" }, { "name": "九江市" }, { "name": "庐山市" },
        { "name": "新余市" }, { "name": "鹰潭市" }, { "name": "赣州市" }]
    },
    {
        "name": "湖南省",
        "next": [{ "name": "长沙市" }, { "name": "浏阳市" }, { "name": "株洲市" }, { "name": "醴陵市" }, { "name": "湘潭市" }, { "name": "娄底市" },
        { "name": "常德市" }, { "name": "岳阳市" }, { "name": "湘乡市" }, { "name": "韶山市" }]
    },
    {
        "name": "福建省",
        "next": [{ "name": "福州市" }, { "name": "福清市" }, { "name": "长乐市" }, { "name": "厦门市" }, { "name": "莆田市" }, { "name": "三明市" },
        { "name": "永安市" }, { "name": "泉州市" }, { "name": "晋江市" }, { "name": "漳州市" }]
    },
    {
        "name": "广东省",
        "next": [{ "name": "广州市" }, { "name": "韶关市" }, { "name": "乐昌市" }, { "name": "南雄市" }, { "name": "深圳市" }, { "name": "珠海市" },
        { "name": "汕头市" }, { "name": "佛山市" }, { "name": "江门市" }, { "name": "鹤山市" }, { "name": "恩平市" }]
    },
    {
        "name": "广西省",
        "next": [{ "name": "南宁市" }, { "name": "柳州市" }, { "name": "桂林市" }, { "name": "梧州市" }, { "name": "北海市" }, { "name": "防城港市" },
        { "name": "东兴市" }, { "name": "钦州市" }, { "name": "贵港市" }, { "name": "桂平市" }]
    },
    {
        "name": "贵州省",
        "next": [{ "name": "贵阳市" }, { "name": "清镇市" }, { "name": "六盘水市" }, { "name": "遵义市" }, { "name": "赤水市" }, { "name": "仁怀市" },
        { "name": "安顺市" }, { "name": "毕节市" }, { "name": "铜仁市" }, { "name": "凯里市" }]
    },
    {
        "name": "四川省",
        "next": [{ "name": "成都市" }, { "name": "崇州市" }, { "name": "简阳市" }, { "name": "自贡市" }, { "name": "攀枝花市" }, { "name": "泸州市" },
        { "name": "德阳市" }, { "name": "绵阳市" }, { "name": "广元市" }, { "name": "遂宁市" }, { "name": "内江市" }]
    },
    {
        "name": "山东省",
        "next": [{ "name": "济南市" }, { "name": "章丘市" }, { "name": "青岛市" }, { "name": "胶州市" }, { "name": "即墨市" }, { "name": "平度市" },
        { "name": "莱西市" }, { "name": "淄博市" }, { "name": "枣庄市" }, { "name": "滕州市" }, { "name": "东营市" }, { "name": "烟台市" }]
    },
    {
        "name": "海南省",
        "next": [{ "name": "海口市" }, { "name": "三亚市" }, { "name": "三沙市" }, { "name": "詹州市" }, { "name": "五指山市" }, { "name": "文昌市" },
        { "name": "万宁市" }, { "name": "东方市" }]
    }

];
var cityLastLevel = ['人民东路', '长安路', '建军路', '人民大道', '新宁路', '玉宁路', '上海东路', '西北大街', '新华北大道', '南四合街', '三和步行街', '北京西路', '长春二路', '兴工街',
    '建国大道', '奋进东路', '南石道街', '临水路南', '鼓楼大道', '来湖西路', '西湖东路', '护国寺南街', '南林路', '友谊大街', '建设大街', '中山西路', '自强路', '汇丰路', '惠民路', '中华北大街', '展览馆路', '厂东街', '北大街', '南四环西路'
    , '西北庄路', '淮北东路', '沿边大道', '湖滨路', '滨湖西路', '胜利大道', '平安南大街', '昆仑路', '天山路', '工人街', '长征街', '和平路', '光华路', '斯大林路','北外环大道'
];