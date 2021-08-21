<script>
	import { onMount } from 'svelte';
    import {fade , slide , scale , fly} from "svelte/transition";
	import { Wave } from 'svelte-loading-spinners'
	
	let y=0;
	let x=0;
    let h=0;
    let loading = false;
	setTimeout(function(){
		loading = false;
	}, 2000);
</script>


<style global> 
	@import "/css/bootstrap.rtl.min.css";
	@import "/global.css";
</style>
{#if loading===true}
	<div style="direction: rtl;text-align:center;margin: auto;width: 100%;height: 100%;">
		<Wave  size="100" color="green" unit="px" duration="1s" ></Wave><span class="loading-snipper">لطفا کمی صبر کنید...</span>
	</div>
{/if}
<svelte:window bind:scrollY={y} bind:innerWidth={x} bind:innerHeight={h}/>

<main transition:scale class="container-fluid sign-parent  direction font-family">
    <div class="row justify-content-center mx-lg-2 ">
        <div class="col-12 col-md-6 ">
            <div class="row justify-content-center">
                <div class="col-12 col-md-9">
                    <div class="row justify-content-start text-right ">
                        <div class="col-12 pt-4 pt-md-0">
                            <img src="image/1.png" class="logo-image-signup" alt="">
                            <h4 class="d-inline webName-signup">اینولینکس</h4>
                        </div>
                        <h2 class="col-12 my-4">
                            از زندگی حرفه ای خود نهایت استفاده را ببرید
                        </h2>
                    </div>
                </div>
                <div class="col-12 col-md-7 bg-white pt-4 pb-2 px-3 border-radius-form-sign">
                    <form action="" method="">
                        <div class="mb-3 font-size-customize-sign">
                          <label for="email" class="form-label">ایمیل</label>
                          <input type="email" class="form-control" id="email" aria-describedby="emailHelp">
                          <!--<div id="emailHelp" class="form-text">We'll never share your email with anyone else.</div> -->
                        </div>
                        <div class="mb-3 font-size-customize-sign">
                          <label for="password" class="form-label">رمزعبور (حداقل ۶ کارکتر)</label>
                          <input type="password" class="form-control" id="password">
                        </div>
                        <button type="submit" class="mt-3 btn btn-primary btn-lg font rounded-circle rounded-pill col-12">ثبت نام</button>
                        <div class="my-3 font-size-customize-sign">
                            <div class="row">
                                <span class="col-5 pl-0 ml-0 d-inline"><hr></span>
                                <span class="col-2 px-0 mx-0 d-inline text-center">یا</span>
                                <span class="col-5 pr-0 mr-0 d-inline"><hr></span>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-white border-2 border-primary btn-lg font rounded-circle text-primary rounded-pill col-12">
                            <span>ثبت نام با اکانت گوگل</span>
                            <i class="fab fa-google text-color-custom"></i>
                        </button>
                        <p class="col-12 mt-2 text-center">
                            تاکنون ثبت نام کرده اید؟ <a href="#" class="text-bold text-primary">واردشوید</a>
                        </p>
                      </form>
                </div>
            </div>
        </div>
    </div>
</main>
<div class="mt-3 mb-0 container-fluid bg-white p-3 direction">
    <div class="row px-1">
        <div class="col-12 col-md-1 mr-md-5">
            <div class="row">
                <div class="col-12 pt-4 pt-md-0">
                    <img src="image/1.png" class="logo-image-signup-footer" alt="">
                    <h6 class="d-inline webName-signup-footer">اینولینکس</h6>
                </div>
            </div>
        </div>
        <div class="col-12 col-md-7 mx-3 mx-md-0 mt-1">
            <div class="row font-size-footer-sign">
                
                <div class="col-6 py-1 py-md-0 col-md-1 px-0 mx-0 my-0 py-0 text-secondary">© ۲۰۲۱</div>
                <div class="col-6 py-1 py-md-0 col-md-1 px-0 mx-0">
                    <a href="about" class=" my-0 py-0 text-secondary">
                        درباره ما
                    </a>
                </div>
                <div class="col-6 py-1 py-md-0 col-md-1 px-0 mx-0">
                    <a href="contact" class=" my-0 py-0 text-secondary">
                        تماس با ما
                    </a>
                </div>
                <div class="col-6 py-1 py-md-0 col-md-1 px-0 mx-0">
                    <a href="/" class=" my-0 py-0 text-secondary">
                         خانه
                    </a>
                </div>
                <div class="col-6 py-1 py-md-0 col-md-1 px-0 mx-0">
                    <a href="profile" class=" my-0 py-0 text-secondary">
                         پروفایل
                    </a>
                </div>
                <div class="col-6 py-1 py-md-0 col-md-1 px-0 mx-0">
                    <a href="magezine" class=" my-0 py-0 text-secondary">
                         مجله
                    </a>
                </div>
                <div class="col-6 col-md-1 px-0 mx-0">
                    <a href="signup" class=" my-0 py-0 text-secondary">
                         تبت نام
                    </a>
                </div>
                <div class="col-6 py-1 py-md-0 col-md-1 px-0 mx-0">
                    <a href="login" class=" my-0 py-0 text-secondary">
                         ورود
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>