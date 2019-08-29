function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function modSpeak(res, requestBody) {
    let modText = requestBody.text.trim();
    
    modText = modText.includes('-tb') ? `*\`\`\`${requestBody.text.trim()}\`\`\`*`
        : modText.includes('-b') ? `* ${modText.replaceAll(modText, '\n', ' * \n *')} *`
        : modText;

    if (modText.includes(`-here`)) {
        modText = `<!here>\n${modText.replace('-here', '')}`
    }
    request.post({
        url: requestBody.response_url,
        json: true,
        body: {
            response_type: 'in_channel',
            text: modText
        }
    });
    res.status(200).send({
        text: "Your message has been posted.",
    });
}
module.exports = {
    replaceAll,
    modSpeak,
};
