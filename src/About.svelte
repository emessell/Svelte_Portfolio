<div id="about" class="container">
    <div class="title">Background</div>
    <div class="flexbox">
        <div class="left">
            <h3 class="company_name">Cancelmarket</h3>
            <div class="small_title">Projects</div>
            <ul class="protect_list">
                <li>1. 서비스 웹 VER.1</li>
                <li>2. 서비스 웹 VER.2</li>
                <li>3. 호텔 관리자 웹</li>
                <li>4. 일반인 관리자 웹</li>
                <li>5. 회사내부 관리자 웹</li>
            </ul>
            <div class="small_title">Skills that I used</div>
            <ul class="skill_list">
                <li>HTML</li>
                <li>CSS</li>
                <li>JAVASCRIPT</li>
                <li>JQUERY</li>
                <li>PHP</li>
                <li>PUG</li>
                <li>LESS</li>
                <li>Node.js</li>
            </ul>
        </div><!--
        --><div class="right">
            <h3 class="company_name">Otheon</h3>
        </div>
    </div>
</div>

<style>
    #about{
        min-height: 700px;
    }
    .title{
        margin-bottom: 30px;
    }
    .flexbox{
        display: flex;
    }
    .left, .right{
        display: inline-block;
        width: 50%;
        height: 700px;
        padding: 15px;
    }
    .left{
        background-color: var(--oxley);
    }
    .right{
        background-color: var(--straw);
    }
    .company_name{
        font-size: 3em;
        border-bottom: 2px solid;
        height: 1.2em;
        font-weight: bold;
    }
    .small_title{
        font-size: 2em;
        font-weight: bold;
        margin-top: 10px;
    }
    .protect_list{
        margin-top: 1em;
    }

    .protect_list li{
        font-weight: bold;
        font-size: 1.2em;
        line-height: 1.5em;
    }

    .skill_list{
        margin-top: 10px;
    }

    .skill_list li{
        display: inline-block;
        background-color: white;
        line-height: 2em;
        border-radius: 2em;
        padding: 0 12px;
        margin: 0 10px 10px 0;
    }
</style>