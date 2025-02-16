const cfg = require("./cfg.json");
const tg = require("telegram-bot-api");
const fetch = require("node-fetch");

const token = "7906680700:AAH0zrhqglzrBOcI1uAs1XNsdmC0bgHd5Vo";
const source = cfg.source;
const valid = cfg.valid;

const limit = cfg.limit;
const resultlimit = cfg.resultlimit;
const searchmin = cfg.searchmin;

const api = new tg({
    token: token
});

const mp = new tg.GetUpdateMessageProvider();
api.setMessageProvider(mp);
api.start()
.then(() => {
    console.log("API is started");
})
.catch(console.err);

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function sendPic(tags, id, author) {
    let tag = tags[Math.floor(Math.random() * tags.length)];

    fetch(tag + ".json?sort=top&t=all&limit=100")
    .then(res => res.json())
    .catch(error => {
        console.log(error);
    })
    .then(json => {
        if (json && json.code && json.code === 429) {
            console.log("Too many requests");
            return;
        }
        
        if (!json || !json.data) {
            console.log("Invalid JSON response");
            sendPic(tags, id, author);
            return;
        }
        
        let list = json.data.children;
        if (!list) {
            sendPic(tags, id, author);
            return;
        }

        let random = list[Math.floor(Math.random() * list.length)];
        let url = random.data.url;

        console.log("Sending " + url + " to " + author);

        let splitted = url.split(".");
        let format = splitted[splitted.length - 1];
        if (valid.indexOf(format) > -1) {
            (async () => {
                api.sendPhoto({
                    chat_id: id,
                    photo: url
                }).catch(error => {
                    console.log(error);
                    console.log("Caught an error while sending " + url + " to " + author + ", trying again");
                    sendPic(tags, id, author);
                });
            })();
        } else {
            console.log("Unable to send " + url + " to " + author + ", trying again");
            sendPic(tags, id, author);
        }
    });
}

function sendVid(url, id, author) {
    fetch(url)
    .then(res => res.json())
    .catch(error => {
        console.log(error);
    })
    .then(json => {
        if (!json) {
            console.log("Invalid JSON response");
            return;
        }

        let post = json[Math.floor(Math.random() * json.length)];
        let link = post.link;
        
        console.log("Sending " + link + " to " + author);

        api.sendMessage({
            chat_id: id,
            text: link
        }).catch(error => {
            console.log(error);
            console.log("Caught an error while sending " + link + " to " + author + ", trying again");
            sendVid(url, id, author);
        });
    });
}

function handleChat(msg, id) {
    const text = msg.toLowerCase();
    
    if (text.includes("hello") || text.includes("hi")) {
        api.sendMessage({
            chat_id: id,
            text: "Hello! How can I assist you today?"
        });
    } else if (text.includes("how are you")) {
        api.sendMessage({
            chat_id: id,
            text: "I'm an AI bot, so I don't have feelings, but I'm here to help you!"
        });
    } else if (text.includes("bye")) {
        api.sendMessage({
            chat_id: id,
            text: "Goodbye! Have a great day!"
        });
    } else {
        api.sendMessage({
            chat_id: id,
            text: "I'm not sure how to respond to that. Please use a valid command or ask something else."
        });
    }
}

api.on("update", data => {
    let msg = data.message;

    let id = msg.chat.id;
    let author = msg.from.username;
    let text = msg.text;

    if (author === undefined) {
        author = msg.from.first_name;
    }

    if (text.indexOf("/") !== -1) {
        let command = text.split("/")[1].split(" ")[0];
        let amount = text.split(" ")[1];

        if (command === "hh") {
            sendVid("https://hentaihaven.com/wp-json/wp/v2/posts?per_page=100&page=" + randomNumber(1, 10), id, author);
        } else if (command.indexOf("hhsearch") !== -1) {
            let searchable = text.split(" ");
            searchable.splice(0, 1);
            let request = searchable.join(" ").toLowerCase();
            let symbols = request.length;

            let found = 0;
            for (let i = 1; i <= 10; i++) {
                fetch("https://hentaihaven.com/wp-json/wp/v2/posts?per_page=100&page=" + i)
                .then(res => res.json())
                .catch(error => {
                    console.log(error);
                })
                .then(json => {
                    if (!json) {
                        console.log("Invalid JSON response");
                        return;
                    }

                    json.forEach(function(item, i, arr) {
                        let title = item.title.rendered.toLowerCase();

                        if (found < resultlimit && symbols >= searchmin && request !== "" && request !== undefined && title.indexOf(request) !== -1) {
                            let link = item.link;
                            found++;

                            console.log("Sending " + link + " to " + author);

                            api.sendMessage({
                                chat_id: id,
                                text: link
                            }).catch(error => {
                                console.log(error);
                                console.log("Caught an error while sending " + link + " to " + author + ", trying again");
                                sendVid(url, id, author);
                            });
                        }
                    });
                });
            }
        } else {
            let tag = source[command];

            if (tag) {
                if (amount === undefined) {
                    sendPic(tag, id, author);
                } else {
                    if (amount > limit) {
                        amount = limit;
                    }
                    for (let i = 0; i < amount; i++) {
                        sendPic(tag, id, author);
                    }
                }
            } else {
                api.sendMessage({
                    chat_id: id,
                    text: "The command you have tried is not available now. It's an invalid command for me. Please use a valid command until my developer brings it for you. Keep exploring. Thank you."
                });
            }
        }
    } else {
        handleChat(text, id);
    }
});
