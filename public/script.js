var lessWord = 50;
var contents = document.querySelectorAll(".content");

contents.forEach(content => {
    var changeToArray = content.textContent.split(' ');
    content.nextElementSibling.style.display = "inline";
    content.nextElementSibling.nextElementSibling.style.display = "none";
    if (changeToArray.length < lessWord) {
        content.nextElementSibling.style.display = "none";
        content.nextElementSibling.nextElementSibling.style.display = "inline";
    } else if (changeToArray.length > lessWord && changeToArray.length <= 500) {
        var displayText = changeToArray.slice(0, lessWord - 1).join(" ");
        var moreText = changeToArray.slice(lessWord - 1, Number(changeToArray.length)).join(" ");
        if (changeToArray.slice(0, lessWord - 1).length <= lessWord) {
            content.nextElementSibling.nextElementSibling.style.display = "none";
            content.innerHTML = `${displayText}<span class="dots">...</span><span class="more hide-more">${moreText}</span>`
        }
    } else if (changeToArray.length > 500) {
        var displayText = changeToArray.slice(0, lessWord - 1).join(" ");
        var moreText = changeToArray.slice(lessWord - 1, 500).join(" ");
        content.innerHTML = `${displayText}<span class="dots">...</span><span class="more hide-more">${moreText}</span><span class="dots1 hide-more">.....</span><span class="coment-for-showdetail hide-more">برای مطالعه کامل مقاله لطفا بروی ادامه مطلب کلیک کنید</span>`
    }
})

function readMore(btn) {
    var post = btn.parentElement;
    post.querySelector(".dots").classList.add("hide-more");
    post.querySelector(".more").classList.remove("hide-more");
    if (post.querySelector(".dots1") && post.querySelector(".coment-for-showdetail")) {
        post.querySelector(".dots1").classList.remove("hide-more");
        post.querySelector(".coment-for-showdetail").classList.remove("hide-more");
    }
    post.querySelector(".read-more").style.display = 'inline';
    btn.style.display = 'none';
    var less = post.childNodes[0].innerHTML.split(" ");
    var more = post.querySelector(".content").childNodes[2].innerHTML.split(" ");
    if ((more.length + less.length) <= 500) {
        btn.style.display = 'none';
    }
}

$(window).resize(function() {
    $("#mod2").click(function() {
        console.log("1")
    })
});
$("#menu").stickOnScroll({
    topOffset: $("header").outerHeight(),
    //bottomOffset: 0,
    //footerElement: $(".author-show-box "),
    setParentOnStick: true,
    setWidthOnStick: true
});
/// sidebar 

// var sidebar = new StickySidebar('.sidebar', {
//     topSpacing: 150,
//     bottomSpacing: 10,
//     containerSelector: '.main-content',
//     innerWrapperSelector: '.sidebar__inner'
// });
// $('#sidebar').stickySidebar({
//     topSpacing: 60,
//     bottomSpacing: 60
// });