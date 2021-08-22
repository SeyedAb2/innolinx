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
        <div class="col-12 col-lg-6 ">
            <div class="row justify-content-center">
                <div class="col-12 col-md-9 mb-5">
                    <div class="row justify-content-start text-right ">
                        <div class="col-12 pt-2 pt-md-0">
                            <img src="image/1.png" class="logo-image-signup" alt="">
                            <h4 class="d-inline webName-signup ">اینولینکس</h4>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-7 col-lg-9 col-xl-7 bg-white pt-4 pb-2 px-4 border-radius-form-sign shadow">
                    <div class="col-12">
                        <div class="row justify-content-start text-right ">
                            <h3 class="col-12 text-bold px-0">
                                ورود
                            </h3>
                            <p class="col-12 px-0 mt-0 mb-4 text-secondary">
                                از دنیای حرفه ای خود مطلع شوید

                            </p>
                        </div>
                    </div>
                    <form action="" method="">
                        <div class="mb-3 font-size-customize-sign">
                          <label for="email" class="form-label">ایمیل</label>
                          <input type="email" class="form-control" id="email" aria-describedby="emailHelp">
                          <!--<div id="emailHelp" class="form-text">We'll never share your email with anyone else.</div> -->
                        </div>
                        <div class="mb-3 font-size-customize-sign">
                          <label for="password" class="form-label">رمزعبور </label>
                          <input type="password" class="form-control" id="password">
                        </div>
                        <p class="col-12 mt-2 text-right px-0">
                           <a href="signup" class="text-bold text-primary">رمز عبور خود را فراموش کرده اید؟</a>
                        </p>
                        <button type="submit" class="my-4 btn btn-primary btn-lg font rounded-circle rounded-pill col-12">وارد شوید</button>
                        
                      </form>
                </div>
                <p class="col-12 mt-5 text-center">
                    هنوز ثبت نام نکرده اید؟ <a href="signup" class="text-bold text-primary">تبت نام کنید</a>
                </p>
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