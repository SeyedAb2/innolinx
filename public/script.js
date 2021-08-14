let lessWord = 5;
let contents = document.querySelectorAll(".content");

contents.forEach(content => {
    let changeToArray = content.textContent.split(' ');
    console.log(Number(changeToArray.length))
    content.nextElementSibling.style.display = "inline";
    if (changeToArray.length < lessWord) {
        content.nextElementSibling.style.display = "none";
        content.nextElementSibling.nextElementSibling.style.display = "inline";
    } else if (changeToArray.length > lessWord && changeToArray.length <= 500) {
        let displayText = content.textContent.substring(0, lessWord - 1);
        let moreText = content.textContent.substring(lessWord - 1, Number(changeToArray.length));
        content.innerHTML = `${displayText}<span class="dots">...</span><span class="more hide-more">${moreText}</span>`
    } else if (changeToArray.length > 500) {
        let displayText = content.textContent.substring(0, lessWord - 1);
        let moreText = content.textContent.substring(lessWord - 1, 500);
        content.innerHTML = `${displayText}<span class="dots">...</span><span class="more hide-more">${moreText}</span><span class="dots1 hide-more">.....</span><span class="coment-for-showdetail hide-more">برای مطالعه کامل مقاله لطفا بروی ادامه مطلب کلیک کنید</span>`
    }
})

function readMore(btn) {
    let post = btn.parentElement;
    post.querySelector(".dots").classList.add("hide-more");
    post.querySelector(".more").classList.remove("hide-more");
    post.querySelector(".dots1").classList.remove("hide-more");
    post.querySelector(".coment-for-showdetail").classList.remove("hide-more");
    post.querySelector(".read-more").style.display = 'inline';
    btn.style.display = 'none';
    if (changeToArray.length > 500) {
        btn.style.display = 'none';
    }



}