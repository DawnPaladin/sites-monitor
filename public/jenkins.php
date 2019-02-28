<?php

@require('secrets.php');

header("Access-Control-Allow-Origin: *");
header("Content-Type: text/json");

function fetch($url) {
	$curl = curl_init($url);
	curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
	$result = curl_exec($curl);
	curl_close($curl);
	// echo $result;
	return json_decode(trim($result), false);
}

$jobs = array();

$credentials = $secrets['old-jenkins']['username'] . ':' . $secrets['old-jenkins']['password'];

$oldJenkinsData = fetch("http://$credentials@jenkins.hkipm.com:8080/api/json?tree=jobs[name,description,color,builds[number,result,timestamp]{0,1}]");
$jobs = array_merge($jobs, $oldJenkinsData->jobs);

$credentials = $secrets['new-jenkins']['username'] . ':' . $secrets['new-jenkins']['password'];

$newJenkinsData = fetch("http://$credentials@jenkins.hkipop.com/api/json?tree=jobs[name,description,color,builds[number,result,timestamp]{0,1}]");
$jobs = array_merge($jobs, $newJenkinsData->jobs);

echo json_encode($jobs);
