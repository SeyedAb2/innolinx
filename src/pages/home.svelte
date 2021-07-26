<script>
    import {onMount} from "svelte";
    import "../App.svelte";
    import {fade , slide , scale , fly} from "svelte/transition";
    import {circIn} from "svelte/easing";
    import { Router, Link, Route } from "svelte-routing";
    import about from "./about.svelte";
    export let url = "";
    export let y;
    //let y=0;
</script>
<style>
    @import "public/global.css";
</style>
<svelte:window bind:scrollY={y}/>
<svelte:head>
    <title>
        اینولینکس
    </title>
</svelte:head>
<section transition:scale class="container-fluid pin-parent ">
    <div class="row justify-content-center mx-lg-2">
        <div class="col-12 col-md-2  mx-1 mt-5 mt-md-0" style="border-radius: 7px;box-shadow: 0 0 4px 0.1px #494949;">hello</div>
        <div class="col-12 col-md-7 mx-2 order-first order-md-0">
            <div class="row justify-content-md-center mx-0 pt-3" style="border-radius: 7px;box-shadow: 0 0 4px 0.1px #494949;">
                <div class="col-12 mb-4 my-md-0">
                    <article class="col-12 bg-danger mb-md-4 first-article-main">
                        <img class="image-pin-top" src="image/30.jpg" alt="">
                        <a class="w-100 content-pin-top" href="#">
                            <h5>جدیدترین اخبار از تحریم فیس بوک توسط آمریکا</h5>
                        </a>
                        <a href="#">
                            <img src="/image/26.jpeg" class="mag-img-top" alt="">
                        </a>
                        <div class="author-time-pin-top">
                            <span>برنامه تلویزیونی جهان آرا <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۲ ماه قبل
                        </div>
                    </article>
                </div>
                <div class="col-12 col-xl-6 mb-4 my-md-0 pin-article-main">
                    <article class="col-12">
                        <img class="image-pin w-100" src="image/28.jpg" alt="">
                        <a class="w-100 content-pin" href="#">
                            <h5>جدیدترین اخبار از تحریم فیس بوک توسط آمریکا</h5>
                        </a>
                        <a href="#">
                            <img src="/image/27.png" class="mag-img" alt="">
                        </a>
                        <div class="author-time-pin">
                            <span>فیس بوک <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۲ ماه قبل
                        </div>
                    </article>
                </div>
                <div class="col-12 col-xl-6 mb-4 mt-lg-0 mt-md-4  pin-article-main">
                    <article class="col-12">
                        <img class="image-pin w-100" src="20.jpg" alt="">
                        <a class="w-100 content-pin" href="#">
                            <h5>به اینولینکس خوش آمدید</h5>
                        </a>
                        <a href="#">
                            <img src="/image/25.jpg" class="mag-img" alt="">
                        </a>
                        <div class="author-time-pin">
                            <span>خبرگذاری تسنیم <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۲ ماه قبل
                        </div>
                    </article>
                </div>
            </div>
        </div>
        <div class="col-12 col-md-2 mx-1 mt-5 mt-md-0" style="border-radius: 7px;box-shadow: 0 0 4px 0.1px #494949;">hello</div>
    </div>
</section>
<br><hr class="col-10 offset-1"><br><br><br>


<!-- 

    <div class="container-fluid">
                <article style="height: 63vh;" class="col-12 mx-lg-auto p-0 height-pin3 pin-article">
                    <div class="img-pin-div">
                        <img class="w-100 d-flex img-pin" src="image/30.jpg" alt="">
                    </div>
                    <div class="content-pin">
                        <h5>
                           <a style="direction: rtl;" class="pin-title pin-title1" href="">نسل جدید تبلت های هوشمند قابلیت بهره گیری از اینترمنت 5G</a> 
                        </h5>
                    </div>
                    <a href="#">
                        <img src="/image/26.jpeg" class="mag-img" alt="">
                    </a>
                    <div class="author-time-pin">
                        <span>برنامه تلویزیونی جهان آرا <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۴ روز قبل
                    </div>
                </article>
                <article class="col-12 height-main mt-2 px-4">
                    <div class="row px-lg-0 justify-content-md-between" style="height: 40vh;">
                        <article class="col-12 col-md-5 ml-md-5 p-0 pin-article height-pin height-pin1 mb-2 mb-lg-0">
                            <div class="img-pin-div">
                                <img class="w-100 d-flex img-pin" src="20.jpg" alt="">
                            </div>
                            <div class="content-pin">
                                <h5>
                                   <a style="font-size: 15px;" class="pin-title" href="">سلام به اینولینکس خوش آمدید</a> 
                                </h5>
                            </div>
                            <a href="#">
                                <img src="/image/25.jpg" class="mag-img" alt="">
                            </a>
                            <div class="author-time-pin">
                                <span>خبرگذاری تسنیم <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۲ ماه قبل
                            </div>
                        </article>
                        <article class="col-12 col-md-5 mr-md-5 p-0 pin-article height-pin height-pin2 ">
                            <div class="img-pin-div">
                                <img class="w-100 d-flex img-pin" src="image/28.jpg" alt="">
                            </div>
                            <div class="content-pin">
                                <h5>
                                   <a style="font-size: 15px;" class="pin-title" href="">شبکه اجتماعی فیس بوک فیلتر شد</a> 
                                </h5>
                            </div>
                            <a href="#">
                                <img src="/image/27.png" class="mag-img" alt="">
                            </a>
                            <div class="author-time-pin">
                                <span>فیس بوک <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۱ دقیقه قبل
                            </div>
                        </article>
                    </div>
                </article>
                <div class="row ">
                    
                </div>
            </div>
  -->
