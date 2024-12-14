// Scrapes the email
const axios = require("axios");
const qs = require('qs');

const cheerio = require('cheerio');





const users = new Map();
const userClasses = new Map();



function getClientId(endpoint) {
    return new Promise(async (resolve, reject) => {



        axios.request({
            method: "GET",
            url: endpoint+"/PXP2_Login.aspx",

            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            }




        })
        .then((response, err) => {
            if (response) {
                console.log(response)
                let cookies = response.headers["set-cookie"]
                
                let prevList = ''
                cookies.forEach((cookie,i) => {
                if (cookie.split(";").length != 0) {
                    let value = cookie.split(";")[0]
                    prevList = prevList + value +"; "
                } else {
                    console.log("ur fake")
                }

                
                
            })
    
    
            prevList = prevList.slice(0, -1)
            resolve(prevList)
            } else {
                if (err) {
                    resolve(err)
                }
                
            }

        })


















    })





}






async function startClient(cookies, url, password, username) {
    return new Promise(async (resolve,reject) => {

        
        

        

    
        let formBody = qs.stringify({
            '__VIEWSTATE': '8ysQ+/7X3U/k9Afjaim6mg7GTzpdygwd0Oj+yQxcZCEXHXhIVxoMHHSBzUKco2bAZ6qdaPbap0Cbc76cQnkXdc+dHBijo1nKwNJRMz45/sM=',
            '__VIEWSTATEGENERATOR': 'E13CECB1',
            '__EVENTVALIDATION': 'AZd2z6LADhkXxlHLC0pIJ4vpNWqNLn4wy+KGl2V3aUy+FeOAUn7Mebp5z0BUCbDsiNNN08Q9r5/EaYcaAT0vpwc9nQIzcksYYDkRwDh1QRPS6IQPmrVPRXca54n5gqUXoVfhmnEgL/cpTZpKAFJIiESSpL2XkKc73n171LI/Pn0=',
            'ctl00$MainContent$username': username,
            'ctl00$MainContent$password': password,
            'ctl00$MainContent$Submit1': 'Login' 
          });
        
        const endpoint = url +"/PXP2_Login_Student.aspx?"
    
    
    
        
        await axios.request({
            url: endpoint,
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies
            },

            data: formBody
        }).then((response, err) => {
            if (response) {
                console.log(response)    
                resolve([response,username])
            } else {
                resolve([err,username])
                console.log(err)
            }
        })
    })
   
    
}

function authenticateUser(req) {
    return new Promise((resolve, reject) => {
        resolve(req)
    })
}

function doEverything(endpoint, password, username) {
    return new Promise(async(resolve) => {
        try {
        
            if ((endpoint === undefined) || (password === undefined) || (username === undefined)) {
                
                return "invalid"
            }
        } catch(e) {
            console.log(e)
            return "invalid"
        }
    
    
    
        getClientId(endpoint).then((clientId) => {
    
            startClient(clientId, endpoint, password, username).then((response) => {
                
                const req = {sessionId: "x", session: {}}
    
                const list = response[0].request.path.split("/").filter((word) => word=="PXP2_Gradebook.aspx" )
    
    
             
        
                if (list.length === 1) {
                    req.session.user = response[1]
                    users.set(req.sessionID, clientId)
                    console.log(users)
    
                    try {
                        endpoint = endpoint
                        if (endpoint === undefined) {
                            return "invalid"
                        }
                    } catch(e) {
                        console.log(e)
                        return 'invalid'
                    }
                
                
                
                    const user = username
                    authenticateUser(user).then((user) => {
                        if (user == "No user found") {
                            console.log("no one was found lol")
                            return "no one found"
                        } else {
                            console.log(user)
                
                            getGrades(user, req, endpoint).then(async(response) => {
                
                
                                const $ = cheerio.load(response.data)
                                const allClasses = $(".gb-class-row")
                                let idList = []
                                let schoolHeaders
                                for (let i=0; i<allClasses.length; i++) {
                                    if ((idList.includes(allClasses[i].attribs['data-guid'])) == false) {
                                        idList.push(allClasses[i].attribs['data-guid'])
                                    } else {
                                        // do nothing
                                    }
                                }
                                const allButtons = $(".btn")
                                for (let k=0; k<allButtons.length; k++) {
                                    try {
                                        
                                        if ((JSON.parse(allButtons[k].attribs['data-focus'])) != (undefined)) {
                                            let parsedData = JSON.parse(allButtons[k].attribs['data-focus']).FocusArgs
                                            schoolHeaders = {
                                                schoolId: parsedData["schoolID"],
                                                studentGU: parsedData["studentGU"],
                                                markPeriodGU: parsedData["markPeriodGU"],
                                                gradePeriodGU: parsedData["gradePeriodGU"],
                                                OrgYearGU: parsedData["OrgYearGU"]
                                            }
                                            
                
                                            break;
                                        
                                        }
                                    } catch(e) {
                                        // nothing
                                    }
                                    
                                }
                                console.log(schoolHeaders)
                                console.log(idList)
                                userClasses.set(user, 
                                    {
                                        schoolHeaders: schoolHeaders,
                                        classes: idList
                                    })
                                        if (user == "No user found") {
                                            console.log("no one was found")
                                            return 'no one found'
                                        } else {
                                            const sessionCookies = users.get(req.session.id)
                                
                                            let gradeBands = []
                                            let firstPeriodId = 0
                                            let allAssignments = []
                                            let allCategories = []
                                            let allClassGrades = []
                                            let firstName
                                            let continueLoop = true;
                                            let data = {}
                                
                                        for (let i=0; i<userClasses.get(user)['classes'].length; i++) {
                                            await preWork(sessionCookies, user, i, endpoint).then(async () => {
                                        
                
                                        
                                            await getNames(sessionCookies, user, endpoint).then(async (names) => {
                                        if (!continueLoop) {
                                            return; 
                                        }
                                        if (sessionCookies != (undefined || null)) {
                                            await preWork(sessionCookies, user, i, endpoint).then(async () => {
                                                await getWork(sessionCookies, user).then(async (response) => {
                                                
                                                if (gradeBands.length === 0) {
                                                    response.data.analysisBands[0].details.map((band, i) => {
                                                        gradeBands.push({
                                                            highScore: band.highScore,
                                                            lowScore: band.lowScore,
                                                            mark: band.mark
                                                        });
                                                    });
                                                }
                                                console.log("try the thing")
                                                    if (i === 0) {
                                                        firstPeriodId = response.data.classId;
                                                        firstName = response.data.students[0].name;
                                                        response.data.measureTypes.map((type) => {
                                                        if (type.weight > 0) {
                                                            allCategories.push(
                                                                {
                                                                    assignmentType: type.name,
                                                                    categoryWorth: type.weight
                                                                }
                                                            )
                                                            
                                                        }
                                                        })
                
                                                        
                                                    }
                                                    let classList = {}
                                                    response.data.assignments.map((assignment) => {
                                                        const key = assignment.gradeBookId
                                                        
                                                        classList[key] = {
                                                            category: assignment.category,
                                                            totalEarned: parseFloat(assignment.score),
                                                            totalPoints: parseFloat(assignment.maxValue)
                                                        }
                                                    });
                                                    allAssignments.push(classList)
                                
                                                    allClassGrades.push({courseName: names.data.d.Data.Classes[i].Name,
                                                        grade: response.data.classGrades[0].totalWeightedPercentage,
                                                        period: i+1,
                                                        courseTeacher: names.data.d.Data.Classes[i].TeacherName})
                
                
                                                await getAssignmentNames(sessionCookies, user, endpoint).then((names) => {
                                                    const dataNames = names.data.responseData.data
                                                    let allNames = []
                                                    dataNames.map((week) => {
                                                        week.items.map((name) => {
                                                            console.log("heres the i value",i)
                                                            console.log("the name is", allAssignments[i][name.itemID])
                                                            console.log("heres the title of the assignment", name.title)
                                                            if (allAssignments[i][name.itemID] != (undefined)) {
                                                                allAssignments[i][name.itemID].name = name.title
                                                                let month = name.monthName
                                                                let day = name.monthDay
                                                               
                                                                let d = new Date()
                                                                let year = d.getFullYear()
                    
                                                                let formattedDate = day+ "-" + month+"-"+ year
                    
                                                                allAssignments[i][name.itemID].date = Date.parse(formattedDate)
                                                            }
                                                           
                
                                                        })
                                                        
                                                    })
                                                    // const reversedNames = allNames.toReversed()
                                                    console.log(names)
                                
                                                })
                
                
                                            })
                                            });
                                        } else {
                                            console.log("session cookie expired");
                                            return "went wrong"
                                            continueLoop = false;
                                        }
                                    });
                                })
                                }
                                users.delete(req.sessionID)
                                userClasses.delete(user)
                                console.log(firstName)
                                // console.log({
                                        
                                //     initialGrades: allClassGrades,
                                // })
                                resolve({initialGrades: allClassGrades, name: firstName})
                                
                                
                                }
                            })
                
                
                        }
                    })
                    console.log(response)
                } else {
                    return 'invalid'
                }
                // this would only occur if it went well 
                // might not be scalable between schools
        
        
        
        
                
            })
    
        })
    

    })
    
}
    


    async function getGrades(user, req, endpoint) {
        return new Promise((resolve) => {
    
        const x = endpoint+"/PXP2_GradeBook.aspx?AGU=0"
    
        const cookieValue = users.get(req.sessionID).substring(0, users.get(req.sessionID).length-1)
        
        const username = "146475"
    
    
        
        console.log(cookieValue)
          let config = {
            method: "GET",
            maxBodyLength: Infinity,
            url: x,
            
            headers: { 
              "Accept": 'application/json, text/plain, */*',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', 
              'Content-Type': 'application/x-www-form-urlencoded', 
              'Cookie': cookieValue
            },
            
            
          };
    
    
          
        //   console.log("the cookie content is :" + cookieValue)
        axios.request(config)
          .then((response,err) => {
            if (response) {
                console.log(JSON.stringify(response.data));
                resolve(response)
            } else {
                console.log(err)
                resolve(err)
            }
            
          })
    
        })
        
    }
    
    function getAssignmentNames(cookie, user, endpoint) {
        return new Promise((resolve, reject) => {
            let data = '{"FriendlyName":"pxp.course.content.items","Method":"LoadWithOptions","Parameters":"{\\"loadOptions\\":{\\"sort\\":[{\\"selector\\":\\"due_date\\",\\"desc\\":false}],\\"filter\\":[[\\"isDone\\",\\"=\\",false]],\\"group\\":[{\\"Selector\\":\\"Week\\",\\"desc\\":false}],\\"requireTotalCount\\":true,\\"userData\\":{}},\\"clientState\\":{}}"}';
    
            let config = {
          method: 'post',
          maxBodyLength: Infinity,
          url: endpoint+'/api/GB/ClientSideData/Transfer?action=pxp.course.content.items-LoadWithOptions',
          headers: { 
            'CURRENT_WEB_PORTAL': 'StudentVUE', 
            'Content-Type': 'application/json; charset=UTF-8', 
            'Cookie': cookie
          },
          data : data
        };
        
        axios.request(config)
        .then((response) => {
    
          resolve(response)
        })
        .catch((error) => {
            resolve(error)
            console.log(error);
        });
        })
       
    
    
    
    }
    
    
    
    function preWork(cookie, user, classIndex, endpoint) {
        return new Promise((resolve) => {
    
            const heresThing = classIndex
    
     
            // ok so remember that the amount of classes is something that we can know easily.
            const userHeaders = userClasses.get(user)
            console.log(userHeaders)
            const x = endpoint+"/service/PXP2Communication.asmx/LoadControl"
            let data = 
            {"request":
                {"control":"Gradebook_RichContentClassDetails",
                "parameters": 
                    {
                        "schoolID": userHeaders.schoolHeaders['schoolId'],
                        "classID":userHeaders.classes[heresThing],
                        "gradePeriodGU": userHeaders.schoolHeaders['gradePeriodGU'],
                        "subjectID":-1,
                        "teacherID":-1,
                        "markPeriodGU": userHeaders.schoolHeaders['markPeriodGU'],
                        "assignmentID":-1,
                        "standardIdentifier":null,
                        "viewName":"courseContent",
                        "studentGU": userHeaders.schoolHeaders['studentGU'],
                        "AGU":"0",
                        "OrgYearGU": userHeaders.schoolHeaders['OrgYearGU']
            }}};
    
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: x,
      headers: { 
        'Content-Type': 'application/json; charset=UTF-8', 
        'Origin': 'https://md-mcps-psv.edupoint.com', 
        'Referer': 'https://md-mcps-psv.edupoint.com/PXP2_GradeBook.aspx?AGU=0', 
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36', 
        'X-Requested-With': 'XMLHttpRequest', 
        'Cookie': cookie
      },
      data : data
    };
    
    axios.request(config)
    .then((response) => {
      resolve(response)
    })
    .catch((error) => {
      console.log(error);
      resolve(error)
    });
    
    
    
        })
    }
    
    
    function getWork(cookie) {
        return new Promise((resolve) => {
    
    
        const endpoint = "https://md-mcps-psv.edupoint.com/api/GB/ClientSideData/Transfer?action=genericdata.classdata-GetClassData"
        let data = '{"FriendlyName":"genericdata.classdata","Method":"GetClassData","Parameters":"{}"}';
    
        let config = {
            method: 'POST',
            maxBodyLength: Infinity,
            url: endpoint,
            headers: { 
                'CURRENT_WEB_PORTAL': 'StudentVUE', 
                'Content-Type': 'application/json; charset=UTF-8', 
                'Cookie': cookie,
                
            },
            data : data
    };
    
    
    
    
    axios.request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
      resolve(response)
    })
    .catch((error) => {
      console.log(error);
      resolve(error)
    });
    
        })
    }
    
    function getNames(cookie, username, endpoint) {
    
        return new Promise((resolve, reject) => {
    
            const userHeaders = userClasses.get(username)
            
    
    
            let data = {"request":
            {
                "gradingPeriodGU":userHeaders.schoolHeaders['gradePeriodGU'],
                "AGU":"0",
                "orgYearGU":userHeaders.schoolHeaders['OrgYearGU'],
                "schoolID": userHeaders.schoolHeaders['schoolId'],
                "markPeriodGU": userHeaders.schoolHeaders['markPeriodGU']
            }}
            let url = endpoint + "/service/PXP2Communication.asmx/GradebookFocusClassInfo"
            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: url,
                headers: { 
                    'Accept': 'application/json, text/javascript, */*; q=0.01', 
                    'Accept-Language': 'en-US,en;q=0.9,es-US;q=0.8,es;q=0.7', 
                    'Connection': 'keep-alive', 
                    'Content-Type': 'application/json; charset=UTF-8', 
                    'Cookie': cookie, 
                },
                data : data
    };
    
    axios.request(config)
    .then((response) => {
        resolve(response)
    })
    .catch((error) => {
      resolve(error)
    });
    
        })
    
    
    
    
    
    
    
    
    
    }


module.exports = {doEverything}
// export {doEverything};